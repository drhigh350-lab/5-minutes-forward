import { notFound } from 'next/navigation';
import {
  getEpisodeBySlug,
  getSequentialNeighbors,
  getGroupingsForEpisode,
  getSiteSettings,
  getRelatedEpisodes,
} from '@/lib/data';
import { EpisodePlayer } from '@/components/EpisodePlayer';
import { PrevNextNav, GroupingPointer, ExploreMoreCard, Transcript, RelatedEpisodes } from '@/components/EpisodePageSections';
import { FeedbackBlock } from '@/components/FeedbackBlock';
import { ShareButton } from '@/components/ShareButton';
import { WhatsAppFollow } from '@/components/LowerSections';
import { Header } from '@/components/Header';
import { JsonLd } from '@/components/JsonLd';
import { formatIsoDuration } from '@/lib/formatters';

const SITE_URL = 'https://forward.techmedng.com';


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

  const title = `${episode.title} — 5 Minutes Forward`;
  const description = episode.description || episode.quote || undefined;
  const url = `${SITE_URL}/${episode.slug}`;
  const image = episode.artworkUrl || '/logo.png';

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: '5 Minutes Forward',
      images: [{ url: image, width: 800, height: 800, alt: episode.title }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function EpisodePage({ params, searchParams }: EpisodePageProps) {
  const { slug } = await params;
  const { autoplay } = await searchParams;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) notFound();

  const [{ prev, next }, groupings, siteSettings, relatedEpisodes] = await Promise.all([
    getSequentialNeighbors(episode),
    getGroupingsForEpisode(episode.id),
    getSiteSettings(),
    getRelatedEpisodes(episode.id),
  ]);

  const episodeUrl = `${SITE_URL}/${episode.slug}`;
  const primaryGrouping = groupings[0]; // an episode can belong to several; show the first as the pointer

  const episodeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PodcastEpisode',
    name: episode.title,
    description: episode.description || episode.quote || undefined,
    url: episodeUrl,
    datePublished: episode.publishedAt,
    duration: formatIsoDuration(episode.durationSeconds),
    image: episode.artworkUrl || `${SITE_URL}/logo.png`,
    associatedMedia: {
      '@type': 'AudioObject',
      contentUrl: `${SITE_URL}/api/audio/${episode.slug}`,
      encodingFormat: 'audio/mpeg',
    },
    partOfSeries: {
      '@type': 'PodcastSeries',
      name: '5 Minutes Forward',
      url: SITE_URL,
    },
  };

  return (
    <div className="mx-auto max-w-content px-5">
      <JsonLd data={episodeJsonLd} />
      <Header />

      <main>
        {/* Above the fold: title, quote, play — nothing else (spec §3) */}
        <section className="pt-4 pb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-mono text-xs tracking-[0.14em] uppercase text-gold">
              Episode {episode.episodeNumber}
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

        {episode.transcript && <Transcript text={episode.transcript} />}

        <PrevNextNav prev={prev} next={next} />

        {primaryGrouping && <GroupingPointer grouping={primaryGrouping} />}

        <RelatedEpisodes episodes={relatedEpisodes} />

        <FeedbackBlock episodeId={episode.id} />

        <ExploreMoreCard />

        <WhatsAppFollow channelUrl={siteSettings.whatsappChannelUrl} />
      </main>
    </div>
  );
}
