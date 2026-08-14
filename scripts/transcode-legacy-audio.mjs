#!/usr/bin/env node
/**
 * One-time bulk fixup for existing episodes whose audio isn't in a
 * format Apple Podcasts accepts (MP3 or M4A/AAC only — see
 * docs/podcast-feed.md). Most existing episodes are WhatsApp voice
 * notes (.opus), which Apple rejects regardless of a valid RSS feed.
 *
 * This is a standalone maintenance script, not part of the deployed
 * app — Cloudflare Workers can't run ffmpeg, so this has to run
 * somewhere with a real filesystem and ffmpeg installed (your machine).
 *
 * Prerequisites:
 *   1. ffmpeg installed and on PATH (brew install ffmpeg / apt install
 *      ffmpeg / choco install ffmpeg — free, one-time).
 *   2. .env.local populated with real values for: NEXT_PUBLIC_SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *      R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.
 *
 * Usage:
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs --dry-run
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs --delete-originals
 *
 * What it does per episode that needs it:
 *   1. Downloads the current audio object from R2.
 *   2. Transcodes to mono AAC/M4A at TARGET_BITRATE via ffmpeg (keeps
 *      file size close to the Opus original instead of the much larger
 *      defaults most converters use).
 *   3. Uploads the result to R2 under a new key (same episode, .m4a
 *      extension).
 *   4. Updates the episode row: audio_object_key, audio_content_type,
 *      audio_file_size_bytes.
 *   5. Leaves the original object in R2 untouched unless
 *      --delete-originals is passed (default: keep, for safety/rollback
 *      — the R2 dashboard or a later cleanup run can remove them once
 *      you've confirmed everything plays correctly).
 *
 * Already-compatible episodes (.mp3 / .m4a) are skipped automatically.
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const TARGET_BITRATE = '64k'; // mono AAC — plenty for spoken word, keeps files small
const COMPATIBLE_EXTENSIONS = new Set(['mp3', 'm4a']);

const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_ORIGINALS = process.argv.includes('--delete-originals');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} — check .env.local and run with --env-file=.env.local`);
    process.exit(1);
  }
  return value;
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const R2_ACCOUNT_ID = requireEnv('R2_ACCOUNT_ID');
const R2_ACCESS_KEY_ID = requireEnv('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = requireEnv('R2_SECRET_ACCESS_KEY');
const R2_BUCKET_NAME = requireEnv('R2_BUCKET_NAME');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

function extensionOf(key) {
  return key.split('.').pop()?.toLowerCase() ?? '';
}

async function checkFfmpegAvailable() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
  } catch {
    console.error('ffmpeg not found on PATH. Install it first (brew install ffmpeg / apt install ffmpeg / choco install ffmpeg).');
    process.exit(1);
  }
}

async function transcodeToM4a(inputPath, outputPath) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-c:a', 'aac',
    '-b:a', TARGET_BITRATE,
    '-ac', '1', // mono
    outputPath,
  ]);
}

async function main() {
  await checkFfmpegAvailable();

  const { data: episodes, error } = await supabase
    .from('episode')
    .select('id, episode_number, title, slug, audio_object_key, audio_content_type')
    .order('episode_number', { ascending: true });
  if (error) throw error;

  const needsConversion = episodes.filter((ep) => !COMPATIBLE_EXTENSIONS.has(extensionOf(ep.audio_object_key)));

  console.log(`${episodes.length} episodes total, ${needsConversion.length} need transcoding.`);
  if (DRY_RUN) {
    for (const ep of needsConversion) {
      console.log(`  [dry-run] Episode ${ep.episode_number} — ${ep.title} (${ep.audio_object_key})`);
    }
    console.log('\nDry run only — nothing was changed. Re-run without --dry-run to actually transcode.');
    return;
  }

  const workDir = await mkdtemp(join(tmpdir(), '5mf-transcode-'));
  let succeeded = 0;
  let failed = 0;

  for (const ep of needsConversion) {
    const label = `Episode ${ep.episode_number} — ${ep.title}`;
    try {
      console.log(`\n${label}`);
      console.log(`  Downloading ${ep.audio_object_key}...`);
      const getResult = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: ep.audio_object_key }));
      const inputBytes = await getResult.Body.transformToByteArray();

      const inputExt = extensionOf(ep.audio_object_key) || 'opus';
      const inputPath = join(workDir, `${ep.id}-in.${inputExt}`);
      const outputPath = join(workDir, `${ep.id}-out.m4a`);
      await writeFile(inputPath, inputBytes);

      console.log('  Transcoding to mono AAC/M4A...');
      await transcodeToM4a(inputPath, outputPath);

      const outputBytes = await readFile(outputPath);
      const outputSize = (await stat(outputPath)).size;

      const newKey = ep.audio_object_key.replace(/\.[^./]+$/, '.m4a');
      console.log(`  Uploading ${newKey} (${(outputSize / 1024).toFixed(0)} KB)...`);
      await r2.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: newKey,
          Body: outputBytes,
          ContentType: 'audio/mp4',
        })
      );

      const { error: updateError } = await supabase
        .from('episode')
        .update({
          audio_object_key: newKey,
          audio_content_type: 'audio/mp4',
          audio_file_size_bytes: outputSize,
        })
        .eq('id', ep.id);
      if (updateError) throw updateError;

      if (DELETE_ORIGINALS && newKey !== ep.audio_object_key) {
        console.log(`  Deleting original ${ep.audio_object_key}...`);
        await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: ep.audio_object_key }));
      }

      console.log('  Done.');
      succeeded++;
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    } finally {
      await rm(join(workDir, `${ep.id}-in.${extensionOf(ep.audio_object_key) || 'opus'}`), { force: true });
      await rm(join(workDir, `${ep.id}-out.m4a`), { force: true });
    }
  }

  await rm(workDir, { recursive: true, force: true });

  console.log(`\nDone: ${succeeded} converted, ${failed} failed, ${episodes.length - needsConversion.length} already compatible.`);
  if (!DELETE_ORIGINALS && succeeded > 0) {
    console.log('Original files were kept in R2 for safety. Once you\'ve confirmed the new episodes play correctly everywhere, re-run with --delete-originals to clean them up.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
