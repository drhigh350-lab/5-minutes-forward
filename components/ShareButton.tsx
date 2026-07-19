'use client';

import { useState } from 'react';
import { logShareEvent } from '@/lib/analytics';

interface ShareButtonProps {
  title: string;
  url: string;
  quote?: string;
  variant?: 'icon' | 'labeled';
  target?: { episodeId: string } | { groupingId: string };
}

/**
 * Sits just below Play in the CTA hierarchy — visible but never louder
 * than the play control (product spec §X — Share). Uses the native share
 * sheet so it lands naturally in WhatsApp DMs, groups, and Status without
 * custom per-platform buttons.
 */
export function ShareButton({ title, url, quote, variant = 'icon', target }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const text = quote
    ? `🎧 5 MINUTES FORWARD\n${title}\n\n"${quote}"\n\nListen here: ${url}`
    : `🎧 5 MINUTES FORWARD\n${title}\n\n${url}`;

  async function handleShare() {
    // Logged optimistically on share-sheet open — not all browsers
    // confirm completion via the Web Share API's promise, so
    // share_initiated is the reliable baseline event (spec §X).
    if (target) logShareEvent(target, 'share_initiated');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled the share sheet — not an error, do nothing.
      }
      return;
    }

    // Fallback for browsers without the Web Share API.
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard also unavailable — silently no-op; icon-only fallback
      // UI has nothing more to offer without a modal, which we're
      // avoiding for this minimal MVP surface.
    }
  }

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink border border-line rounded-full px-4 py-2 hover:border-ink transition-colors"
      >
        <ShareIcon />
        {copied ? 'Link copied' : 'Share'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? 'Link copied' : 'Share'}
      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-navy-tint transition-colors shrink-0"
    >
      <ShareIcon />
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
      <circle cx="15" cy="4" r="2.2" stroke="#14213D" strokeWidth="1.4" />
      <circle cx="5" cy="10" r="2.2" stroke="#14213D" strokeWidth="1.4" />
      <circle cx="15" cy="16" r="2.2" stroke="#14213D" strokeWidth="1.4" />
      <path d="M7 8.8L13 5.2M7 11.2L13 14.8" stroke="#14213D" strokeWidth="1.4" />
    </svg>
  );
}
