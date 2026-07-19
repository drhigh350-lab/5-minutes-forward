import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/LowerSections';
import { getAllEpisodes } from '@/lib/data';
import { formatDuration } from '@/lib/formatters';

export const metadata: Metadata = {
  title: 'All Episodes — 5 Minutes Forward',
  description: 'Every 5 Minutes Forward episode, newest first.',
};

export default async function EpisodesPage() {
  const episodes = await getAllEpisodes();

  return (
    <div className="mx-auto max-w-content px-5">
      <Header />
      <main>
        <section className="pt-4 pb-6">
          <p className="eyebrow mb-2">Browse</p>
          <h1 className="font-display text-2xl text-ink leading-snug">All Episodes</h1>
        </section>

        {episodes.length === 0 ? (
          <p className="text-muted py-8">No episodes published yet — check back soon.</p>
        ) : (
          <ul className="divide-y divide-line pb-8">
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
        )}
      </main>
      <Footer />
    </div>
  );
}
