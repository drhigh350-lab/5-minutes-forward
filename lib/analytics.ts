'use client';

import { createPublicClient } from './supabase';
import { getSessionId } from './localProgress';

export type PlaybackEventType =
  | 'play_start'
  | 'progress_25'
  | 'progress_50'
  | 'progress_75'
  | 'completed';

export type ShareEventType = 'share_initiated' | 'share_completed';

/**
 * Fires a PlaybackEvent (spec §7/§8) — a real insert now, allowed by the
 * "public insert playback_event" RLS policy already on the table (anon
 * can INSERT but never SELECT/UPDATE/DELETE — verified directly against
 * the live schema). Aggregation into episode_stats/grouping_stats still
 * happens on a separate scheduled job (not yet built — see README).
 */
export function logPlaybackEvent(
  episodeId: string,
  eventType: PlaybackEventType,
  positionSeconds: number
) {
  const supabase = createPublicClient();
  supabase
    .from('playback_event')
    .insert({
      episode_id: episodeId,
      event_type: eventType,
      position_seconds: Math.round(positionSeconds),
      session_id: getSessionId(),
    })
    .then(({ error }) => {
      if (error && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[analytics] playback_event insert failed', error);
      }
    });
}

/** Fires a ShareEvent (spec §X — Share) for either an episode or a grouping. */
export function logShareEvent(
  target: { episodeId: string } | { groupingId: string },
  eventType: ShareEventType
) {
  const supabase = createPublicClient();
  const row =
    'episodeId' in target
      ? { target_type: 'episode' as const, episode_id: target.episodeId, grouping_id: null }
      : { target_type: 'grouping' as const, grouping_id: target.groupingId, episode_id: null };

  supabase
    .from('share_event')
    .insert({ ...row, event_type: eventType, session_id: getSessionId() })
    .then(({ error }) => {
      if (error && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[analytics] share_event insert failed', error);
      }
    });
}
