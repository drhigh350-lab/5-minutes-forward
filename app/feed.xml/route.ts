import { NextResponse } from 'next/server';
import { getAllEpisodesForFeed } from '@/lib/data';
import { guessAudioContentType } from '@/lib/audio';

// Reads from Supabase on every request — same reason every other
// data-backed route in this app is force-dynamic (see app/sitemap.ts):
// statically generating this at build time would hit the missing-env
// build failure this project already fixed once for its pages.
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://forward.techmedng.com';
const PODCAST_TITLE = '5 Minutes Forward';
const PODCAST_DESCRIPTION =
  'Short audio episodes to help you think better, learn better, and live better. An initiative of TECHMED.';
const PODCAST_AUTHOR = 'TECHMED';
// TODO: confirm this is a real, monitored inbox before submitting to
// Apple Podcasts Connect — it's required at submission time even
// though it isn't required for the feed itself to be valid.
const PODCAST_OWNER_EMAIL = 'hello@techmedng.com';
const PODCAST_IMAGE = `${SITE_URL}/logo.png`;
const PODCAST_LANGUAGE = 'en';
const PODCAST_CATEGORY = 'Education';
const PODCAST_SUBCATEGORY = 'Self-Improvement';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const episodes = await getAllEpisodesForFeed();

  const items = episodes
    .map((ep) => {
      const url = `${SITE_URL}/${ep.slug}`;
      const enclosureUrl = `${SITE_URL}/api/audio/${ep.slug}`;
      const contentType = ep.audio_content_type || guessAudioContentType(ep.audio_object_key);
      // Historical episodes uploaded before file size started being
      // captured at upload time don't have one — 0 is a widely-tolerated
      // placeholder (most players stream progressively rather than
      // hard-requiring an accurate byte count upfront).
      const length = ep.audio_file_size_bytes ?? 0;
      const pubDate = new Date(ep.published_at ?? ep.created_at).toUTCString();
      const description = ep.description || ep.quote || '';
      const image = ep.artwork_url || PODCAST_IMAGE;

      return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="false">${escapeXml(ep.id)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <enclosure url="${escapeXml(enclosureUrl)}" length="${length}" type="${escapeXml(contentType)}" />
      <itunes:title>${escapeXml(ep.title)}</itunes:title>
      <itunes:episode>${ep.episode_number}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:duration>${ep.duration_seconds ?? 0}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:image href="${escapeXml(image)}" />
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(PODCAST_TITLE)}</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(PODCAST_DESCRIPTION)}</description>
    <language>${PODCAST_LANGUAGE}</language>
    <image>
      <url>${PODCAST_IMAGE}</url>
      <title>${escapeXml(PODCAST_TITLE)}</title>
      <link>${SITE_URL}</link>
    </image>
    <itunes:author>${escapeXml(PODCAST_AUTHOR)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(PODCAST_AUTHOR)}</itunes:name>
      <itunes:email>${escapeXml(PODCAST_OWNER_EMAIL)}</itunes:email>
    </itunes:owner>
    <itunes:image href="${PODCAST_IMAGE}" />
    <itunes:category text="${PODCAST_CATEGORY}">
      <itunes:category text="${PODCAST_SUBCATEGORY}" />
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
