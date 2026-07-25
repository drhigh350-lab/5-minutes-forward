import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/LowerSections';
import { getAllGroupings } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Series & Collections — 5 Minutes Forward',
  description: 'Sequential series and topical collections on 5 Minutes Forward.',
};

export default async function SeriesPage() {
  const groupings = await getAllGroupings();
  const series = groupings.filter((g) => g.type === 'series');
  const collections = groupings.filter((g) => g.type === 'collection');

  return (
    <div className="mx-auto max-w-content px-5">
      <Header />
      <main>
        <section className="pt-4 pb-6">
          <p className="eyebrow mb-2">Browse</p>
          <h1 className="font-display text-2xl text-ink leading-snug">Series &amp; Collections</h1>
        </section>

        {groupings.length === 0 ? (
          <p className="text-muted py-8">Nothing published yet — check back soon.</p>
        ) : (
          <>
            {series.length > 0 && <GroupingSection title="Series" items={series} />}
            {collections.length > 0 && <GroupingSection title="Collections" items={collections} />}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function GroupingSection({
  title,
  items,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getAllGroupings>>;
}) {
  return (
    <section className="pb-8">
      <p className="eyebrow mb-3">{title}</p>
      <ul className="divide-y divide-line">
        {items.map((g) => (
          <li key={g.slug}>
            <Link href={`/series/${g.slug}`} className="flex items-center justify-between py-4 group">
              <span className="min-w-0">
                <span className="block text-ink group-hover:underline decoration-line underline-offset-4">
                  {g.title}
                </span>
                {g.description && (
                  <span className="block text-sm text-muted truncate mt-0.5">{g.description}</span>
                )}
              </span>
              <span className="font-mono text-xs text-muted shrink-0 ml-3">{g.episodeCount} eps</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
