import type { Metadata } from 'next';
import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { PlayerProvider } from '@/context/PlayerContext';
import { MiniPlayer } from '@/components/MiniPlayer';
import { JsonLd } from '@/components/JsonLd';

// Display serif — used with restraint, headlines and episode titles only.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

// Body/UI sans — everything else.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
});

// Utility/data face — episode numbers, durations, timestamps. Reinforces
// the "counting five minutes" feel without adding a fourth typeface.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-plex-mono',
  weight: ['400', '500'],
});

const SITE_URL = 'https://forward.techmedng.com';
const SITE_TITLE = '5 Minutes Forward';
const SITE_DESCRIPTION =
  'Short audio episodes to help you think better, learn better, and live better. An initiative of TECHMED.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_TITLE,
    images: [{ url: '/logo.png', width: 800, height: 800, alt: SITE_TITLE }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/logo.png'],
  },
};

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'PodcastSeries',
  name: SITE_TITLE,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  image: `${SITE_URL}/logo.png`,
  publisher: {
    '@type': 'Organization',
    name: 'TECHMED',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <JsonLd data={siteJsonLd} />
        <PlayerProvider>
          {/* pb-24 keeps the fixed MiniPlayer from covering page content, with
              extra clearance now that the title can wrap to two lines */}
          <div className="pb-24">{children}</div>
          <MiniPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
