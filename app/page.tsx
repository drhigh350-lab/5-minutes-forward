import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FeaturedGrouping } from '@/components/FeaturedGrouping';
import { RecentEpisodes } from '@/components/RecentEpisodes';
import { ExploreTeaser, CollectiveSection, WhatsAppFollow, Footer } from '@/components/LowerSections';
import {
  getLatestEpisode,
  getFeaturedGrouping,
  getRecentEpisodes,
  getExploreTeaser,
  getSiteSettings,
} from '@/lib/data';

export const runtime = 'edge'

export const dynamic='force-dynamic';

export default async function HomePage() {
  const [latestEpisode, featured, recentEpisodes, exploreTeaser, siteSettings] = await Promise.all([
    getLatestEpisode(),
    getFeaturedGrouping(),
    getRecentEpisodes(),
    getExploreTeaser(),
    getSiteSettings(),
  ]);

  // Genuinely empty state — no episode has been published yet (true
  // right now: the CMS hasn't created any rows). Not an error state.
  if (!latestEpisode) {
    return (
      <div className="mx-auto max-w-content px-5">
        <Header />
        <main className="py-16 text-center">
          <p className="eyebrow mb-3">🎧 5 Minutes Forward</p>
          <p className="text-muted">The first episode hasn&rsquo;t been published yet — check back soon.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-5">
      <Header />
      <main>
        <Hero latestEpisode={latestEpisode} />
        {featured && (
          <FeaturedGrouping grouping={featured.grouping} memberEpisodeIds={featured.memberEpisodeIds} />
        )}
        <RecentEpisodes episodes={recentEpisodes} />
        {exploreTeaser && <ExploreTeaser {...exploreTeaser} />}
        <CollectiveSection inviteUrl={siteSettings.collectiveInviteUrl} />
        <WhatsAppFollow channelUrl={siteSettings.whatsappChannelUrl} />
      </main>
      <Footer />
    </div>
  );
}
