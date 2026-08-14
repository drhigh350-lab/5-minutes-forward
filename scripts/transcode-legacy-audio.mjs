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
 *      ffmpeg / choco install ffmpeg / pkg install ffmpeg on Termux —
 *      free, one-time).
 *   2. .env.local populated with real values for: NEXT_PUBLIC_SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *      R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.
 *
 * Usage:
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs --dry-run
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs --delete-originals
 *
 *   # Re-transcode episodes that were already converted to .m4a but
 *   # came out distorted (e.g. the first run's ffmpeg settings clipped
 *   # — see the alimiter/faststart flags below). Re-downloads each
 *   # episode's original .opus (still in R2 since originals are kept
 *   # by default) and overwrites the existing .m4a in place.
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs --redo --dry-run
 *   node --env-file=.env.local scripts/transcode-legacy-audio.mjs --redo
 *
 * What a normal (non---redo) run does per episode that needs it:
 *   1. Downloads the current audio object from R2.
 *   2. Transcodes to mono AAC/M4A at TARGET_BITRATE via ffmpeg (keeps
 *      file size close to the Opus original instead of the much larger
 *      defaults most converters use), with a peak limiter to avoid
 *      clipping/crackling and +faststart for clean progressive playback.
 *   3. Uploads the result to R2 under a new key (same episode, .m4a
 *      extension).
 *   4. Updates the episode row: audio_object_key, audio_content_type,
 *      audio_file_size_bytes.
 *   5. Leaves the original object in R2 untouched unless
 *      --delete-originals is passed (default: keep, for safety/rollback).
 *
 * Already-compatible episodes (.mp3 / .m4a) are skipped automatically
 * in normal mode. --redo mode only touches episodes whose original
 * .opus/.ogg sibling object still exists in R2.
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const TARGET_BITRATE = '64k'; // mono AAC — plenty for spoken word, keeps files small
const COMPATIBLE_EXTENSIONS = new Set(['mp3', 'm4a']);
const REDO_SOURCE_EXTENSIONS = ['opus', 'ogg'];

const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_ORIGINALS = process.argv.includes('--delete-originals');
const REDO = process.argv.includes('--redo');

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

function withExtension(key, ext) {
  return key.replace(/\.[^./]+$/, `.${ext}`);
}

async function objectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function checkFfmpegAvailable() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
  } catch {
    console.error('ffmpeg not found on PATH. Install it first (brew install ffmpeg / apt install ffmpeg / choco install ffmpeg / pkg install ffmpeg).');
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
    // Peak limiter: voice recordings from a phone mic are often close
    // to 0dB already, and re-encoding through a different codec without
    // headroom can push transients over full scale, which is heard as
    // clicks/cracks on hard consonants. Capping true peaks at -95%
    // fixes that without audibly changing the recording otherwise.
    '-af', 'alimiter=limit=0.95:attack=5:release=50',
    // Puts the moov atom at the front so playback can start progressively
    // instead of needing the whole file (or at least trailing metadata)
    // fetched first.
    '-movflags', '+faststart',
    outputPath,
  ]);
}

/** Finds candidate episodes for a normal run: audio not already MP3/M4A. */
async function findNeedsConversion() {
  const { data: episodes, error } = await supabase
    .from('episode')
    .select('id, episode_number, title, slug, audio_object_key, audio_content_type')
    .order('episode_number', { ascending: true });
  if (error) throw error;

  const candidates = episodes.filter((ep) => !COMPATIBLE_EXTENSIONS.has(extensionOf(ep.audio_object_key)));
  return { total: episodes.length, candidates };
}

/**
 * Finds candidate episodes for --redo: currently .m4a, but with an
 * .opus/.ogg sibling object still present in R2 (i.e. episodes a
 * previous run already converted, whose original hasn't been deleted).
 */
async function findRedoCandidates() {
  const { data: episodes, error } = await supabase
    .from('episode')
    .select('id, episode_number, title, slug, audio_object_key, audio_content_type')
    .order('episode_number', { ascending: true });
  if (error) throw error;

  const m4aEpisodes = episodes.filter((ep) => extensionOf(ep.audio_object_key) === 'm4a');
  const candidates = [];

  for (const ep of m4aEpisodes) {
    for (const ext of REDO_SOURCE_EXTENSIONS) {
      const candidateSourceKey = withExtension(ep.audio_object_key, ext);
      if (await objectExists(candidateSourceKey)) {
        candidates.push({ ...ep, sourceKey: candidateSourceKey });
        break;
      }
    }
  }

  return { total: episodes.length, candidates };
}

async function processEpisode(ep, { sourceKey, targetKey, deleteSourceAfter }, workDir) {
  const label = `Episode ${ep.episode_number} — ${ep.title}`;
  console.log(`\n${label}`);

  const inputExt = extensionOf(sourceKey) || 'opus';
  const inputPath = join(workDir, `${ep.id}-in.${inputExt}`);
  const outputPath = join(workDir, `${ep.id}-out.m4a`);

  try {
    console.log(`  Downloading ${sourceKey}...`);
    const getResult = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: sourceKey }));
    const inputBytes = await getResult.Body.transformToByteArray();
    await writeFile(inputPath, inputBytes);

    console.log('  Transcoding to mono AAC/M4A...');
    await transcodeToM4a(inputPath, outputPath);

    const outputBytes = await readFile(outputPath);
    const outputSize = (await stat(outputPath)).size;

    console.log(`  Uploading ${targetKey} (${(outputSize / 1024).toFixed(0)} KB)...`);
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: targetKey,
        Body: outputBytes,
        ContentType: 'audio/mp4',
      })
    );

    const { error: updateError } = await supabase
      .from('episode')
      .update({
        audio_object_key: targetKey,
        audio_content_type: 'audio/mp4',
        audio_file_size_bytes: outputSize,
      })
      .eq('id', ep.id);
    if (updateError) throw updateError;

    if (deleteSourceAfter && targetKey !== sourceKey) {
      console.log(`  Deleting original ${sourceKey}...`);
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: sourceKey }));
    }

    console.log('  Done.');
    return true;
  } catch (err) {
    console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  } finally {
    await rm(inputPath, { force: true });
    await rm(outputPath, { force: true });
  }
}

async function main() {
  await checkFfmpegAvailable();

  const { total, candidates } = REDO ? await findRedoCandidates() : await findNeedsConversion();

  if (REDO) {
    console.log(`${total} episodes total, ${candidates.length} have a recoverable original to redo.`);
  } else {
    console.log(`${total} episodes total, ${candidates.length} need transcoding.`);
  }

  if (DRY_RUN) {
    for (const ep of candidates) {
      const source = REDO ? ep.sourceKey : ep.audio_object_key;
      console.log(`  [dry-run] Episode ${ep.episode_number} — ${ep.title} (${source})`);
    }
    console.log('\nDry run only — nothing was changed. Re-run without --dry-run to actually transcode.');
    return;
  }

  const workDir = await mkdtemp(join(tmpdir(), '5mf-transcode-'));
  let succeeded = 0;
  let failed = 0;

  for (const ep of candidates) {
    const sourceKey = REDO ? ep.sourceKey : ep.audio_object_key;
    const targetKey = REDO ? ep.audio_object_key : withExtension(ep.audio_object_key, 'm4a');
    const ok = await processEpisode(ep, { sourceKey, targetKey, deleteSourceAfter: DELETE_ORIGINALS }, workDir);
    if (ok) succeeded++;
    else failed++;
  }

  await rm(workDir, { recursive: true, force: true });

  console.log(`\nDone: ${succeeded} converted, ${failed} failed, ${total - candidates.length} skipped.`);
  if (!DELETE_ORIGINALS && succeeded > 0) {
    console.log('Original files were kept in R2 for safety. Once you\'ve confirmed the new episodes play correctly everywhere, re-run with --delete-originals to clean them up.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
