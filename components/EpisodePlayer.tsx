'use client';

import { useEffect, useRef } from 'react';
import { usePlayer, PLAYBACK_RATES } from '@/context/PlayerContext';
import { Episode } from '@/lib/types';
import { PlayDial } from './PlayDial';
import { formatDuration } from '@/lib/formatters';
import { logPlaybackEvent } from '@/lib/analytics';
import { getPlayedEpisodeIds } from '@/lib/localProgress';

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
  const hasLoggedVisit = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const isCurrent = player.isCurrentEpisode(episode.id);
  const status = isCurrent ? player.status : 'idle';
  const isPlaying = isCurrent && player.isPlaying;
  const currentTime = isCurrent ? player.currentTime : 0;
  const duration = isCurrent && player.duration ? player.duration : episode.durationSeconds;
  const bufferedSeconds = isCurrent ? player.bufferedSeconds : 0;
  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const bufferedFraction = duration > 0 ? Math.min(1, bufferedSeconds / duration) : 0;

  // Funnel instrumentation (top of funnel): fires once per page view,
  // independent of whether the visitor ever taps Play. A separate
  // 'return_visit' also fires for a browser that has finished an
  // episode before, so "distribution → page visit → play attempt" is
  // actually distinguishable in the dashboard instead of only ever
  // seeing play taps.
  useEffect(() => {
    if (hasLoggedVisit.current) return;
    hasLoggedVisit.current = true;
    logPlaybackEvent(episode.id, 'page_visit', 0, resolveTrafficSource());
    if (getPlayedEpisodeIds().size > 0) {
      logPlaybackEvent(episode.id, 'return_visit', 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.id]);

  // Handle ?autoplay=1 from the homepage Play button (spec §3). Only
  // fires once per mount; if the browser blocks it, playEpisode's own
  // fallback leaves status 'idle' and the ring just sits ready to tap.
  useEffect(() => {
    if (autoplay && !hasAutoplayed.current) {
      hasAutoplayed.current = true;
      player.playEpisode(episode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay]);

  function handlePlayToggle() {
    if (isCurrent && status === 'error') {
      player.retry();
    } else if (isCurrent) {
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

  const dialLabel = status === 'error' ? 'Retry' : isPlaying ? 'Pause' : 'Play';

  return (
    <div>
      <div className="flex items-center gap-4">
        <PlayDial
          label={dialLabel}
          durationSeconds={episode.durationSeconds}
          progressFraction={progressFraction}
          isPlaying={isPlaying}
          status={status}
          onClick={handlePlayToggle}
        />

        <div className="flex-1 min-w-0">
          <div
            ref={progressBarRef}
            onClick={handleScrub}
            className="relative h-1.5 bg-line rounded-full cursor-pointer overflow-hidden"
          >
            {/* Buffered progress sits behind the played fill, so a
                listener on a slow connection can see how much is ready
                to play versus how far they've actually gotten. */}
            <div
              className="absolute inset-y-0 left-0 h-full bg-ink-soft/25"
              style={{ width: `${Math.min(100, bufferedFraction * 100)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 h-full bg-ink"
              style={{ width: `${Math.min(100, progressFraction * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 font-mono text-xs text-muted">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-600 mt-2 ml-[104px]">
          Couldn&rsquo;t load this episode. Check your connection and tap the dial to try again.
        </p>
      )}
      {status === 'buffering' && (
        <p className="text-xs text-muted mt-2 ml-[104px]">Buffering…</p>
      )}

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

/**
 * Traffic source for the page_visit event. Our own share links (see
 * ShareButton) append ?src=whatsapp/telegram/etc. — that's the
 * primary, reliable signal, since it survives regardless of referrer
 * policy. document.referrer is the fallback for organic traffic (a
 * Google search result, a link pasted elsewhere), but many apps —
 * WhatsApp's mobile client in particular — strip the referrer header
 * entirely for privacy, so it under-counts share-driven traffic that
 * isn't carrying a ?src= tag.
 */
function resolveTrafficSource(): string {
  if (typeof window === 'undefined') return 'unknown';

  const tagged = new URLSearchParams(window.location.search).get('src');
  if (tagged) return tagged;

  if (document.referrer) {
    try {
      return new URL(document.referrer).hostname;
    } catch {
      return 'direct';
    }
  }

  return 'direct';
}
