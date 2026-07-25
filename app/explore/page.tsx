import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/LowerSections';
import { getPopularEpisodes, getPopularGroupings } from '@/lib/data';
import { formatDuration } from '@/lib/formatters';

export const metadata: Metadata = {
  title: 'Explore — 5 Minutes Forward',
  description: 'What listeners are engaging with most on 5 Minutes Forward.',
};

export default async function ExplorePage() {
  const [episodes, groupings] = await Promise.all([getPopularEpisodes(), getPopularGroupings()]);
  const isEmpty = episodes.length === 0 && groupings.length === 0;

  return (
    <div className="mx-auto max-w-content px-5">
      <Header />
      <main>
        <section className="pt-4 pb-6">
          <p className="eyebrow mb-2">🔥 Explore</p>
          <h1 className="font-display text-2xl text-ink leading-snug">Popular Right Now</h1>
        </section>

        {isEmpty ? (
          // Genuinely empty until enough listens accumulate for anything
          // to clear the popularity threshold — not an error state.
          <p className="text-muted py-8">
            Nothing has enough listens yet to show here. Check back once a few more people catch up.
          </p>
        ) : (
          <>
            {episodes.length > 0 && (
              <section className="pb-8">
                <p className="eyebrow mb-3">Episodes</p>
                <ul className="divide-y divide-line">
                  {episodes.map((ep) => (
                    <li key={ep.slug}>
                      <Link href={`/${ep.slug}`} className="flex items-center justify-between py-4 group">
                        <span className="flex items-baseline gap-3 min-w-0">
                          <span className="font-mono text-xs text-muted shrink-0">Day {ep.episodeNumber}</span>
                          <span className="text-ink group-hover:underline decoration-line underline-offset-4 truncate">
                            {ep.title}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-muted shrink-0 ml-3">
                          {formatDuration(ep.durationSeconds)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {groupings.length > 0 && (
              <section className="pb-8">
                <p className="eyebrow mb-3">Series &amp; Collections</p>
                <ul className="divide-y divide-line">
                  {groupings.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/series/${g.slug}`} className="flex items-center justify-between py-4 group">
                        <span className="text-ink group-hover:underline decoration-line underline-offset-4 truncate">
                          {g.title}
                        </span>
                        <span className="font-mono text-xs text-muted shrink-0 ml-3">{g.episodeCount} eps</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
