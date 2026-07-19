import type { Config } from 'tailwindcss';

// Design tokens for 5 Minutes Forward.
// Signature motif: a ring/dial (see components/PlayDial.tsx) standing in
// for the "5 minutes" of each episode. Gold appears ONLY on that ring and
// tiny highlight moments — never as a background or large fill.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14213D', // primary navy — headlines, primary buttons
        'ink-soft': '#2B3A5C', // hover/active states off ink
        paper: '#F7F7F5', // page background — warm-neutral, not stark white
        surface: '#FFFFFF', // cards sitting on paper
        muted: '#6B7280', // secondary/body-support text
        line: '#E4E4E0', // hairline dividers, card borders
        'navy-tint': '#E4E8F1', // soft tint for badges/pills
        gold: '#C99A3B', // the ONE accent — ring progress, small highlights only
        'gold-soft': '#EFE1C3',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: {
        content: '640px', // primary column width — mobile-first, kept
        // narrow even on desktop since most sessions arrive from WhatsApp
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
