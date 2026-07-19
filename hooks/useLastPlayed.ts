'use client';

import { useEffect, useState } from 'react';
import { LastPlayed } from '@/lib/types';

export const STORAGE_KEY = '5mf_last_played';
const NEAR_COMPLETE_THRESHOLD = 0.95;

/**
 * Written by the global PlayerContext (Phase 2) on a throttled interval
 * during playback. This is the single source of truth the Hero's
 * visitor-state detection reads — keeping the write format here means
 * the player and the homepage never drift out of sync.
 */
export function writeLastPlayed(record: LastPlayed) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — playback
    // still works, it just won't be resumable. Never throw from here.
  }
}

export type VisitorState =
  | { kind: 'loading' }
  | { kind: 'first-time' }
  | { kind: 'finished-last'; lastPlayed: LastPlayed }
  | { kind: 'continue'; lastPlayed: LastPlayed };

/**
 * Reads the anonymous local playback record (see product spec §5) and
 * classifies the visitor so the hero can branch (Phase 0/1).
 *
 * This intentionally runs client-side only — SSR renders the 'loading'
 * state, which the Hero treats identically to 'first-time' to avoid
 * flashing content. There is a brief moment where a returning visitor
 * sees the first-time layout before hydration resolves; this is an
 * accepted MVP trade-off, since the alternative (cookie-based SSR
 * detection) adds real infra complexity for a cosmetic gain.
 */
export function useLastPlayed(): VisitorState {
  const [state, setState] = useState<VisitorState>({ kind: 'loading' });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setState({ kind: 'first-time' });
        return;
      }

      const lastPlayed: LastPlayed = JSON.parse(raw);
      const fraction =
        lastPlayed.durationSeconds > 0
          ? lastPlayed.positionSeconds / lastPlayed.durationSeconds
          : 0;

      if (fraction >= NEAR_COMPLETE_THRESHOLD) {
        setState({ kind: 'finished-last', lastPlayed });
      } else {
        setState({ kind: 'continue', lastPlayed });
      }
    } catch {
      // Corrupt or inaccessible storage — fail safe to first-time rather
      // than throwing, since this must never block rendering the page.
      setState({ kind: 'first-time' });
    }
  }, []);

  return state;
}

export function formatRemaining(positionSeconds: number, durationSeconds: number) {
  const remaining = Math.max(0, Math.round(durationSeconds - positionSeconds));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return `${m}:${s.toString().padStart(2, '0')} remaining`;
}

