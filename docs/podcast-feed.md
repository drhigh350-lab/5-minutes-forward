# Podcast RSS feed

## Feed URL

```
https://forward.techmedng.com/feed.xml
```

Generated dynamically at `app/feed.xml/route.ts` from published `episode` rows in Supabase (`lib/data.ts`'s `getAllEpisodesForFeed()`). There is nothing to run or regenerate — publishing an episode through the CMS (`/admin/episodes`) makes it appear in the feed on the next request automatically. Unpublishing/deleting removes it the same way.

Autodiscovery is wired up site-wide via `app/layout.tsx`'s `alternates.types` (`<link rel="alternate" type="application/rss+xml">`), and there's a plain link in the site footer.

## How it's built

- **Channel-level metadata** (title, description, author, owner email, artwork, language, category, explicit flag) is hardcoded as constants at the top of `app/feed.xml/route.ts`. These change rarely enough that a database round-trip isn't worth it — edit the file directly if any of them need to change.
- **Episode-level metadata** comes straight from the `episode` table: title, description/quote, `episode_number`, `published_at`, `duration_seconds`.
- **`<enclosure>`** points at the existing `/api/audio/[slug]` endpoint (not a raw R2 URL) — that endpoint already resolves to either a public R2 hostname or a signed URL, and podcast apps/validators follow redirects fine. This means the feed doesn't need to know anything about R2 directly, and audio URL resolution logic stays in exactly one place.
- **`<guid>`** uses the episode's Supabase `id` (UUID) with `isPermaLink="false"` — stable even if the slug or title changes later.
- **File size / MIME type**: captured automatically at upload time in the admin CMS (`EpisodeForm.tsx`, alongside the duration auto-detection that already existed) and stored on the episode row (`audio_file_size_bytes`, `audio_content_type`). Episodes uploaded before this existed don't have a stored size (the feed falls back to `length="0"`, which podcast apps generally tolerate) and don't have a stored content type (the feed guesses one from the file extension via `guessAudioContentType()` in `lib/audio.ts`).

## ⚠️ Audio format

**New episodes**: WhatsApp voice notes are `.opus`, and confirmed via Apple's own documentation, Apple Podcasts only accepts **MP3 or M4A/AAC** — Opus isn't supported at all, independent of the feed being valid. Before uploading a new episode's audio to the CMS, convert the downloaded `.opus` file to M4A (AAC, mono, ~64kbps — matches Opus's small file size instead of ballooning it) using a free browser-based converter such as [cdkm.com/opus-to-m4a](https://cdkm.com/opus-to-m4a) (converts locally in the browser, nothing uploaded to a server) or [FreeConvert](https://www.freeconvert.com/opus-to-m4a). This is a manual step for now; if it becomes a bottleneck at daily-episode volume, it could be automated into the upload flow later.

**Existing episodes**: `scripts/transcode-legacy-audio.mjs` bulk-converts every already-published episode whose audio isn't already MP3/M4A, and updates the corresponding `episode` row (`audio_object_key`, `audio_content_type`, `audio_file_size_bytes`) to match. Run it once:

```
node --env-file=.env.local scripts/transcode-legacy-audio.mjs --dry-run   # preview what would change
node --env-file=.env.local scripts/transcode-legacy-audio.mjs             # actually convert
```

Requires `ffmpeg` installed locally (free — `brew install ffmpeg` / `apt install ffmpeg` / `choco install ffmpeg`) and a `.env.local` with real Supabase + R2 credentials. Original audio files are kept in R2 by default (not deleted) so this is safely reversible; once you've confirmed the converted episodes play correctly everywhere, re-run with `--delete-originals` to clean up the old files. See the script's header comment for full details.

## Validating the feed

1. **[Podba.se validator](https://podba.se/validate/)** or **[Cast Feed Validator](https://www.castfeedvalidator.com/)** — paste in the feed URL, checks RSS + iTunes namespace compliance.
2. **Google's [Rich Results Test](https://search.google.com/test/rich-results)** is for on-page structured data, not RSS — don't use it to validate this feed.
3. Manually confirm after publishing a new episode: fetch `/feed.xml`, check the new `<item>` appears with a working `<enclosure>` URL.

## Submitting to platforms

- **Apple Podcasts**: submit via [Apple Podcasts Connect](https://podcastsconnect.apple.com/) using the feed URL above. Apple will want the owner email (`PODCAST_OWNER_EMAIL` in `app/feed.xml/route.ts`) to be real and monitored — confirm/update it before submitting.
- **Spotify**: submit via [Spotify for Podcasters](https://podcasters.spotify.com/) using the same feed URL.
- Both platforms crawl the feed periodically after submission — no further action needed per episode once submitted, publishing through the CMS is sufficient.

## What needs to be maintained going forward

- Keep `published_at` reliable — this drives the feed's `pubDate` (and the sitemap's freshness). The CMS now preserves an episode's original publish date across edits and only sets it automatically the first time an episode is published (see `lib/adminData.ts`'s `updateEpisode()`); avoid manually clearing it.
- If the channel-level artwork changes, update `public/logo.png` (also used for OG images/favicon) — no separate podcast-artwork file exists. Note Apple recommends 1400×1400–3000×3000px artwork for podcast submissions specifically; the current logo is 800×800, which is fine for OG/web use but under Apple's preferred minimum.
- If episode audio format changes (e.g. a future transcoding step), no feed code changes are needed — `audio_content_type` and `guessAudioContentType()` already handle whatever's actually stored.
