import { notFound } from 'next/navigation';
import { getEpisodeBySlug, getSequentialNeighbors, getGroupingsForEpisode, getSiteSettings } from '@/lib/data';
import { EpisodePlayer } from '@/components/EpisodePlayer';
import { PrevNextNav, GroupingPointer, ExploreMoreCard } from '@/components/EpisodePageSections';
import { FeedbackBlock } from '@/components/FeedbackBlock';
import { ShareButton } from '@/components/ShareButton';
import { WhatsAppFollow } from '@/components/LowerSections';
import { Header } from '@/components/Header';

// Next.js 15: params/searchParams are Promises in the App Router and
// must be awaited — this was written against the pre-15 sync convention
// and would fail to build. Fixed here.
interface EpisodePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ autoplay?: string }>;
}

export async function generateMetadata({ params }: EpisodePageProps) {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) return {};
  return {
    title: `${episode.title} — 5 Minutes Forward`,
    description: episode.description,
  };
}

export default async function EpisodePage({ params, searchParams }: EpisodePageProps) {
  const { slug } = await params;
  const { autoplay } = await searchParams;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) notFound();

  const [{ prev, next }, groupings, siteSettings] = await Promise.all([
    getSequentialNeighbors(episode),
    getGroupingsForEpisode(episode.id),
    getSiteSettings(),
  ]);

  const episodeUrl = `https://forward.techmedng.com/${episode.slug}`;
  const primaryGrouping = groupings[0]; // an episode can belong to several; show the first as the pointer

  return (
    <div className="mx-auto max-w-content px-5">
      <Header />

      <main>
        {/* Above the fold: title, quote, play — nothing else (spec §3) */}
        <section className="pt-4 pb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-mono text-xs tracking-[0.14em] uppercase text-gold">
              Day {episode.episodeNumber}
            </p>
            <ShareButton
              title={episode.title}
              url={episodeUrl}
              quote={episode.quote}
              variant="icon"
              target={{ episodeId: episode.id }}
            />
          </div>
          <h1 className="font-display text-2xl text-ink leading-snug mb-3">{episode.title}</h1>
          <p className="text-muted italic mb-6">&ldquo;{episode.quote}&rdquo;</p>

          <EpisodePlayer episode={episode} autoplay={autoplay === '1'} />
        </section>

        <PrevNextNav prev={prev} next={next} />

        {primaryGrouping && <GroupingPointer grouping={primaryGrouping} />}

        <FeedbackBlock episodeId={episode.id} />

        <ExploreMoreCard />

        <WhatsAppFollow channelUrl={siteSettings.whatsappChannelUrl} />
      </main>
    </div>
  );
}
