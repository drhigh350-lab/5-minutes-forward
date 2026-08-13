import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/LowerSections';
import { getPopularEpisodes, getPopularGroupings } from '@/lib/data';
import { formatDuration } from '@/lib/formatters';

export const metadata: Metadata = {
  title: 'Explore — 5 Minutes Forward',
  description: 'What listeners are engaging with most on 5 Minutes Forward.',
  alternates: {
    canonical: 'https://forward.techmedng.com/explore',
  },
};

export const dynamic = 'force-dynamic';

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
                <ul>
                  {episodes.map((ep) => (
                    <li key={ep.slug} className="border-b border-line last:border-b-0">
                      <Link href={`/${ep.slug}`} className="flex items-start py-3.5 group">
                        <span className="font-mono text-xs text-muted shrink-0 w-24 pt-0.5">Episode {ep.episodeNumber}</span>
                        <span className="flex-1 min-w-0 pr-3 text-ink group-hover:underline decoration-line underline-offset-4 whitespace-normal break-words">
                          {ep.title}
                        </span>
                        <span className="font-mono text-xs text-muted shrink-0 w-12 text-right pt-0.5">
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
                <ul>
                  {groupings.map((g) => (
                    <li key={g.slug} className="border-b border-line last:border-b-0">
                      <Link href={`/series/${g.slug}`} className="flex items-start py-3.5 group">
                        <span className="flex-1 min-w-0 pr-3 text-ink group-hover:underline decoration-line underline-offset-4 whitespace-normal break-words">
                          {g.title}
                        </span>
                        <span className="font-mono text-xs text-muted shrink-0 pt-0.5">{g.episodeCount} eps</span>
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
