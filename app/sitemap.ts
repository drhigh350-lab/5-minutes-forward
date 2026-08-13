import type { MetadataRoute } from 'next';
import { getAllEpisodes, getAllGroupings } from '@/lib/data';

const SITE_URL = 'https://forward.techmedng.com';

// Fetches from Supabase, so this must stay dynamic — statically
// generating it at build time hits the same missing-env-var failure
// every other data-backed route in this app had before force-dynamic
// was added to them.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [episodes, groupings] = await Promise.all([getAllEpisodes(), getAllGroupings()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/episodes`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/series`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/explore`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/collective`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const episodeRoutes: MetadataRoute.Sitemap = episodes.map((ep) => ({
    url: `${SITE_URL}/${ep.slug}`,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  const groupingRoutes: MetadataRoute.Sitemap = groupings.map((g) => ({
    url: `${SITE_URL}/series/${g.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...episodeRoutes, ...groupingRoutes];
}
