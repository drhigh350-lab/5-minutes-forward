import type { Metadata } from 'next';
import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { PlayerProvider } from '@/context/PlayerContext';
import { MiniPlayer } from '@/components/MiniPlayer';

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

export const metadata: Metadata = {
  title: '5 Minutes Forward',
  description:
    'Short audio episodes to help you think better, learn better, and live better. An initiative of TECHMED.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <PlayerProvider>
          {/* pb-16 keeps the fixed MiniPlayer from covering page content */}
          <div className="pb-16">{children}</div>
          <MiniPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}
