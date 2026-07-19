'use client';

import { useEffect, useRef } from 'react';
import { usePlayer, PLAYBACK_RATES } from '@/context/PlayerContext';
import { Episode } from '@/lib/types';
import { PlayDial } from './PlayDial';
import { formatDuration } from '@/lib/formatters';

interface EpisodePlayerProps {
  episode: Episode;
  autoplay?: boolean;
}

/**
 * The episode page's own player surface. Delegates all actual playback
 * to the global PlayerContext (spec §4) rather than owning its own
 * <audio> element — that's what lets playback continue seamlessly if
 * the visitor taps "← Home" mid-episode.
 */
export function EpisodePlayer({ episode, autoplay = false }: EpisodePlayerProps) {
  const player = usePlayer();
  const hasAutoplayed = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const isCurrent = player.isCurrentEpisode(episode.id);
  const isPlaying = isCurrent && player.isPlaying;
  const currentTime = isCurrent ? player.currentTime : 0;
  const duration = isCurrent && player.duration ? player.duration : episode.durationSeconds;
  const progressFraction = duration > 0 ? currentTime / duration : 0;

  // Handle ?autoplay=1 from the homepage Play button (spec §3). Only
  // fires once per mount; if the browser blocks it, playEpisode's own
  // .catch() leaves isPlaying false and the ring just sits ready to tap.
  useEffect(() => {
    if (autoplay && !hasAutoplayed.current) {
      hasAutoplayed.current = true;
      player.playEpisode(episode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  function handlePlayToggle() {
    if (isCurrent) {
      player.toggle();
    } else {
      player.playEpisode(episode);
    }
  }

  function handleScrub(e: React.MouseEvent<HTMLDivElement>) {
    if (!isCurrent || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    player.seek(fraction * duration);
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <PlayDial
          label={isPlaying ? 'Pause' : 'Play'}
          durationSeconds={episode.durationSeconds}
          progressFraction={progressFraction}
          isPlaying={isPlaying}
          onClick={handlePlayToggle}
        />

        <div className="flex-1 min-w-0">
          <div
            ref={progressBarRef}
            onClick={handleScrub}
            className="h-1.5 bg-line rounded-full cursor-pointer overflow-hidden"
          >
            <div
              className="h-full bg-ink"
              style={{ width: `${Math.min(100, progressFraction * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 font-mono text-xs text-muted">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 ml-[104px]">
        <button
          type="button"
          onClick={() => isCurrent && player.skip(-10)}
          disabled={!isCurrent}
          className="text-xs font-mono text-muted disabled:opacity-30"
        >
          ⏪ 10
        </button>
        <div className="flex items-center gap-1">
          {PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => player.setPlaybackRate(rate)}
              className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                player.playbackRate === rate ? 'bg-navy-tint text-ink' : 'text-muted'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => isCurrent && player.skip(10)}
          disabled={!isCurrent}
          className="text-xs font-mono text-muted disabled:opacity-30"
        >
          10 ⏩
        </button>
      </div>
    </div>
  );
}
