'use client';

const SESSION_KEY = '5mf_session_id';
const PLAYED_KEY = '5mf_played_episode_ids';

/** Stable anonymous id for this browser, used only to dedupe PlaybackEvents within a session (spec §5.2) — never tied to an account. */
export function getSessionId(): string {
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Storage unavailable — fall back to a per-call random id rather
    // than throwing; analytics just won't dedupe across reloads.
    return crypto.randomUUID();
  }
}

/** Local record of "episodes this browser has finished," used by the
 * topical-collection tier of the autoplay resolution (spec §4) to pick
 * the next *unplayed* episode rather than always the first one. This is
 * a lightweight MVP stand-in — a real implementation would fold this
 * into ListeningProgress once accounts/sync exist. */
export function getPlayedEpisodeIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(PLAYED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markEpisodePlayed(episodeId: string) {
  try {
    const ids = getPlayedEpisodeIds();
    ids.add(episodeId);
    window.localStorage.setItem(PLAYED_KEY, JSON.stringify([...ids]));
  } catch {
    // Non-fatal — see note above.
  }
}
