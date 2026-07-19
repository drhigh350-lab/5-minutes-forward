# 5 Minutes Forward — Scaffold (Phase 1 + 2 + 3)

This is a hand-written scaffold — produced in a sandbox with no network
access, so `npm install` couldn't run here. A manual `tsc` pass against
every file found two real bugs (now fixed — see git history / diffs);
everything else remaining was confirmed to be caused only by missing
`node_modules` (no `@supabase/supabase-js`, no `@types/react`, etc.),
which `npm install` resolves.

```bash
cp .env.example .env.local   # fill in real values — see below
npm install
npm run dev
```

## Phase 1 — Homepage

`Hero` branches first-time / returning-visitor via
`hooks/useLastPlayed.ts`. `PlayDial` / `SeriesProgressRing` are the
signature ring/dial motif. `FeaturedGrouping`, `RecentEpisodes`,
`ExploreTeaser`, `CollectiveSection`, `WhatsAppFollow`, `Footer` round
out the page. `ShareButton` uses the Web Share API with a clipboard
fallback.

## Phase 2 — Episode page + persistent mini-player

`context/PlayerContext.tsx` holds a single `<audio>` element above the
router (mounted in `app/layout.tsx`) so playback survives navigation.
Autoplay-next resolution implements the exact three-tier fallback from
spec §4 (sequential series → topical collection, next unplayed →
next-newest overall). `MiniPlayer` is the global fixed bottom bar;
`EpisodePlayer` is the episode page's own surface, delegating all
playback to the same context. `app/[slug]/page.tsx` is the episode
page — title/quote/play above the fold, everything else below.
`?autoplay=1` wires the homepage's Play button through to autoplay on
arrival (with a documented caveat about browser autoplay policy).
`FeedbackBlock` is emoji-first with optional text.

## Phase 3 — Supabase integration + CMS

**This phase started with a live audit**, not a fresh schema. The
`5-Minutes-Forward` Supabase project (ref `nourqoxqgxaulfstdgwn`) already
had a solid schema built by your programmer — episodes, groupings,
join tables, topics, feedback, playback/share events, stats tables with
`SECURITY DEFINER`-backed public popularity views, indexes, and a
singleton `site_settings` table. Full findings are in the conversation;
summary:

**Fixed directly on the live DB (3 migrations applied):**
- `public_episode_popularity` / `public_grouping_popularity` views were
  missing `security_invoker = on` (a real ERROR-level Supabase lint) and
  had overly broad grants (INSERT/UPDATE/DELETE, not just SELECT) —
  tightened.
- Added `AFTER INSERT` triggers on `episode`/`grouping_entity` so a
  matching `episode_stats`/`grouping_stats` row always exists — the
  popularity views depended on this row existing, and nothing was
  creating it.
- Those two trigger functions were themselves flagged (Postgres grants
  `EXECUTE` to `PUBLIC` by default on `SECURITY DEFINER` functions) —
  revoked from `anon`/`authenticated` so they're only reachable via the
  trigger, not as a public RPC.

**Reconciled, not duplicated:** the schema has two ways to mark a
featured grouping — `grouping_entity.featured` (boolean) and
`site_settings.featured_grouping_id`. Rather than picking one silently,
`lib/data.ts`'s `getFeaturedGrouping()`/`getExploreTeaser()` treat
`site_settings` as the source of truth, falling back to the boolean if
unset.

**No admin write access existed at all** — zero INSERT/UPDATE/DELETE
policies on any content table, zero `auth.users` rows. Went with
**Approach A** (your choice): all CMS writes go through
`app/api/admin/**` route handlers using the Supabase **service role**
key (server-only, bypasses RLS), gated by a simple HMAC-signed session
cookie (`lib/adminAuth.ts` + `middleware.ts`) rather than full Supabase
Auth — appropriate for a single admin.

**Still open (flagged, not blocking):** no scheduled job yet rolling
`playback_event`/`share_event` into `episode_stats`/`grouping_stats` —
`pg_cron` is available on the project but not enabled. The
`/admin/stats` page is fully wired and will show real numbers the
moment that job exists; until then it correctly shows all-zero rows,
which is accurate, not broken.

### Data layer

- `lib/supabase.ts` — three-tier client factory: `createPublicClient()`
  (anon key, RLS-bound, safe anywhere), `createAdminClient()` (service
  role, server-only, bypasses RLS).
- `lib/types.ts` — added real snake_case `*Row` types matching the live
  schema (verified by direct inspection, not guessed) alongside the
  existing camelCase app types.
- `lib/dbMappers.ts` — converts DB rows to app types; also the single
  place emoji ↔ the DB's named `feedback_reaction` enum
  (`insight`/`love`/`thinking`/`fire`) gets translated.
- `lib/data.ts` — **replaces `lib/mockData.ts` entirely** (deleted).
  Same function signatures as before; `resolveNextEpisode` and
  `getSequentialNeighbors` now run real multi-step Supabase queries
  implementing the exact three-tier autoplay fallback from spec §4.
- `lib/r2.ts` — S3-compatible client for Cloudflare R2.
  `app/api/audio/[slug]/route.ts` now actually resolves `audio_object_key`
  → a presigned R2 URL (or a public CDN hostname if
  `R2_PUBLIC_HOSTNAME` is set) and 302-redirects, rather than the old
  501 stub.
- `lib/analytics.ts`, `components/FeedbackBlock.tsx`,
  `components/ShareButton.tsx` — all three now write real rows
  (`playback_event`, `share_event`, `feedback`) via the public client,
  replacing the earlier `TODO`/console-log stubs.
- `FeaturedGrouping` had to become genuinely client-side: "N of M
  completed" is inherently per-visitor, local-only data (no accounts),
  so it can't be computed server-side. It now reads the same
  `5mf_played_episode_ids` set the autoplay resolver uses.
- Homepage now has a real empty state (no episodes published yet) since
  the DB currently has 0 content rows.

### CMS (`/admin`)

- `/admin/login` — password form → signed cookie.
  `middleware.ts` gates every `/admin/*` page and `/api/admin/*` route.
- `/admin/episodes` (list), `/new`, `/[id]` (edit) — full form: episode
  number (auto-suggested), slug (auto from number), title, quote,
  description, audio upload (direct-to-R2 via a presigned PUT from
  `/api/admin/audio-upload-url`, with **client-side duration
  auto-detection** before upload), artwork URL, series/collection
  multi-select with per-grouping position input when ordered, topic
  multi-select with inline "add new topic", featured toggle, Save
  Draft / Publish. Publishing shows the spec's WhatsApp copy-paste
  screen (link / promo text / title, one-tap copy).
- `/admin/groupings` (list), `/new`, `/[id]` (edit) — title, slug,
  description, type (series/collection, toggles `is_ordered`
  automatically), status, artwork URL, display order, featured.
- `/admin/settings` — Forward Collective invite URL, WhatsApp Channel
  URL, featured grouping picker (writes `site_settings`).
- `/admin/feedback` — reaction totals + chronological list.
- `/admin/stats` — the only place raw `play_count` /
  `completion_rate` / `share_count` / `is_popular` are ever shown, per
  spec's "backend-only, with a public badge" rule.

## Environment variables

See `.env.example` — every variable is documented with what it's for
and where to get it: Supabase URL/anon key/service role key, the admin
session secret + password, and the four R2 credentials. Nothing in this
list should ever be committed; `.gitignore` already excludes `.env*`.

## What's genuinely not built yet

- The scheduled stats-aggregation job (`pg_cron` or an edge function) —
  the single biggest remaining gap. Everything downstream of it
  (`/admin/stats`, the public `is_popular` badge, ranked Explore page)
  is wired and waiting for real numbers.
- `/episodes`, `/series`, `/series/[slug]`, `/explore`, `/collective`
  public routes — linked from the homepage/episode page, not yet built.
- Drag-and-drop reordering in the groupings admin (position is a plain
  number input per episode for now — functional, not fancy).
- Artwork upload (currently a URL field, not a direct upload widget —
  same R2 presign pattern as audio would work here too).

## A note on the localStorage hydration trade-off

`useLastPlayed` resolves client-side only, so there's a brief moment on
first paint where a returning visitor sees the first-time layout before
JS hydrates. This was an explicit trade-off in the spec (§0) rather than
an oversight — a cookie-based SSR alternative is possible later if this
flash becomes a real problem in practice.


