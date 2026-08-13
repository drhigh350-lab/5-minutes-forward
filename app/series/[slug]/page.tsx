import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/LowerSections';
import { ShareButton } from '@/components/ShareButton';
import { GroupingDetailClient } from '@/components/GroupingDetailClient';
import { getGroupingBySlug } from '@/lib/data';


// Next.js 15: page params are a Promise and must be awaited.
interface GroupingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GroupingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getGroupingBySlug(slug);
  if (!result) return {};

  const { grouping } = result;
  const title = `${grouping.title} — 5 Minutes Forward`;
  const description = grouping.description || undefined;
  const url = `https://forward.techmedng.com/series/${grouping.slug}`;
  const image = grouping.artworkUrl || '/logo.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: '5 Minutes Forward',
      images: [{ url: image, width: 800, height: 800, alt: grouping.title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function GroupingDetailPage({ params }: GroupingPageProps) {
  const { slug } = await params;
  const result = await getGroupingBySlug(slug);
  if (!result) notFound();

  const { grouping, episodes } = result;
  const groupingUrl = `https://forward.techmedng.com/series/${grouping.slug}`;
  const label = grouping.type === 'series' ? 'Series' : 'Collection';

  return (
    <div className="mx-auto max-w-content px-5">
      <Header />
      <main>
        <section className="pt-4 pb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="eyebrow">{label}</p>
            <ShareButton
              title={grouping.title}
              url={groupingUrl}
              variant="icon"
              target={{ groupingId: grouping.id }}
            />
          </div>
          <h1 className="font-display text-2xl text-ink leading-snug mb-2">{grouping.title}</h1>
          {grouping.description && <p className="text-muted mb-1">{grouping.description}</p>}
          <p className="font-mono text-xs text-muted">{grouping.episodeCount} episodes</p>
        </section>

        {episodes.length === 0 ? (
          <p className="text-muted py-8">No episodes in this {label.toLowerCase()} yet.</p>
        ) : (
          <GroupingDetailClient grouping={grouping} episodes={episodes} />
        )}
      </main>
      <Footer />
    </div>
  );
}
