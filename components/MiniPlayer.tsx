'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePlayer, PLAYBACK_RATES, PlayerMode } from '@/context/PlayerContext';
import { formatDuration } from '@/lib/formatters';

const MODE_LABEL: Record<PlayerMode, string> = {
  'off': 'Off',
  'repeat-one': 'Repeat',
  'autoplay-all': 'Autoplay',
};
const MODE_CYCLE: PlayerMode[] = ['autoplay-all', 'repeat-one', 'off'];

/**
 * Lives in the root layout, outside the page content, so it never
 * unmounts on navigation (spec §4 — "keep the phone, keep listening").
 * Renders nothing until an episode has been started.
 */
export function MiniPlayer() {
  const player = usePlayer();
  const [showRates, setShowRates] = useState(false);

  if (!player.episode) return null;

  const { episode, isPlaying, currentTime, duration, playbackRate, mode } = player;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function cycleMode() {
    const idx = MODE_CYCLE.indexOf(mode);
    player.setMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-line">
      {/* Thin progress line across the very top of the bar */}
      <div className="h-[2px] bg-line">
        <div className="h-full bg-gold transition-[width]" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="mx-auto max-w-content px-4 py-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={player.toggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-10 h-10 shrink-0 rounded-full bg-ink flex items-center justify-center"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <Link href={`/${episode.slug}`} className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-wide uppercase text-muted">
            Day {episode.episodeNumber}
          </p>
          <p className="text-sm text-ink truncate leading-tight">{episode.title}</p>
        </Link>

        <span className="font-mono text-xs text-muted hidden sm:inline shrink-0">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>

        <button
          type="button"
          onClick={() => player.skip(-10)}
          aria-label="Back 10 seconds"
          className="w-8 h-8 shrink-0 flex items-center justify-center text-ink"
        >
          <SkipIcon direction="back" />
        </button>
        <button
          type="button"
          onClick={() => player.skip(10)}
          aria-label="Forward 10 seconds"
          className="w-8 h-8 shrink-0 flex items-center justify-center text-ink"
        >
          <SkipIcon direction="forward" />
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowRates((s) => !s)}
            className="font-mono text-xs text-muted w-9 h-8 flex items-center justify-center rounded hover:bg-navy-tint"
          >
            {playbackRate}x
          </button>
          {showRates && (
            <div className="absolute bottom-full mb-1 right-0 bg-surface border border-line rounded shadow-sm overflow-hidden">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    player.setPlaybackRate(rate);
                    setShowRates(false);
                  }}
                  className={`block w-full px-3 py-1.5 text-xs font-mono text-left hover:bg-navy-tint ${
                    rate === playbackRate ? 'text-ink font-medium' : 'text-muted'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={cycleMode}
          aria-label={`Playback mode: ${MODE_LABEL[mode]}`}
          className="font-mono text-[10px] text-muted w-12 h-8 shrink-0 rounded hover:bg-navy-tint hidden xs:block"
        >
          {MODE_LABEL[mode]}
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="ml-0.5">
      <path d="M6 4L20 12L6 20V4Z" fill="#F7F7F5" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <rect x="5" y="4" width="5" height="16" fill="#F7F7F5" />
      <rect x="14" y="4" width="5" height="16" fill="#F7F7F5" />
    </svg>
  );
}
function SkipIcon({ direction }: { direction: 'back' | 'forward' }) {
  const flip = direction === 'back' ? 'scale-x-[-1]' : '';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={flip}>
      <path
        d="M4 12a8 8 0 1 1 2.3 5.6M4 12V6M4 12h6"
        stroke="#14213D"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
