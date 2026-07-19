'use client';

import Link from 'next/link';
import { useLastPlayed, formatRemaining } from '@/hooks/useLastPlayed';
import { formatDuration } from '@/lib/formatters';

import { PlayDial } from './PlayDial';
import { Episode } from '@/lib/types';

interface HeroProps {
  latestEpisode: Episode;
}

/**
 * Branches by visitor state (product spec §1). SSR/first paint always
 * renders the first-time layout; a returning visitor's version swaps in
 * client-side once localStorage resolves (see useLastPlayed for the
 * trade-off this implies).
 */
export function Hero({ latestEpisode }: HeroProps) {
  const state = useLastPlayed();

  if (state.kind === 'continue') {
    const { lastPlayed } = state;
    return (
      <section className="pt-10 pb-8">
        <p className="eyebrow mb-3">👋 Welcome back</p>
        <h1 className="font-display text-2xl text-ink mb-1">Continue where you stopped</h1>
        <p className="text-muted mb-6">
          Day {lastPlayed.episodeNumber} —{' '}
          {formatRemaining(lastPlayed.positionSeconds, lastPlayed.durationSeconds)}
        </p>

        <div className="flex items-center gap-4">
          <PlayDial
            label="Continue listening"
            durationSeconds={lastPlayed.durationSeconds}
            href={`/${lastPlayed.slug}?autoplay=1`}
          />
          <div>
            <p className="font-display text-lg text-ink leading-snug">{lastPlayed.title}</p>
          </div>
        </div>

        <Link
          href={`/${latestEpisode.slug}`}
          className="inline-block mt-6 text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
        >
          Or start today&rsquo;s episode →
        </Link>
      </section>
    );
  }

  // 'loading' | 'first-time' | 'finished-last' all render this layout —
  // only the eyebrow/greeting differs for a warmer returning-but-caught-up tone.
  const isFinished = state.kind === 'finished-last';

  return (
    <section className="pt-10 pb-8">
      <p className="eyebrow mb-3">{isFinished ? '👋 Welcome back' : '🎧 5 Minutes Forward'}</p>

      {!isFinished && (
        <h1 className="font-display text-3xl leading-tight text-ink mb-6">
          Just 5 minutes today.
          <br />A better future tomorrow.
        </h1>
      )}

      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="font-mono text-xs tracking-[0.14em] uppercase text-gold mb-2">
          Day {latestEpisode.episodeNumber}
        </p>
        <h2 className="font-display text-xl text-ink leading-snug mb-3">{latestEpisode.title}</h2>
        <p className="text-muted italic mb-5">&ldquo;{latestEpisode.quote}&rdquo;</p>

        <div className="flex items-center gap-4">
          <PlayDial
            label="Play"
            durationSeconds={latestEpisode.durationSeconds}
            href={`/${latestEpisode.slug}?autoplay=1`}
          />
          <span className="font-mono text-sm text-muted">
            {formatDuration(latestEpisode.durationSeconds)}
          </span>
        </div>
      </div>

      {!isFinished && (
        <p className="text-sm text-muted mt-5">
          Short daily audio to help you think, learn, and live better.
        </p>
      )}
    </section>
  );
}
