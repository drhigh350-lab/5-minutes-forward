'use client';

import { useState } from 'react';
import { logShareEvent } from '@/lib/analytics';

interface ShareButtonProps {
  title: string;
  url: string;
  quote?: string;
  variant?: 'icon' | 'labeled';
  label?: string;
  target?: { episodeId: string } | { groupingId: string };
}

/**
 * Sits just below Play in the CTA hierarchy — visible but never louder
 * than the play control (product spec §X — Share). Prefers the native
 * share sheet (WhatsApp/Telegram/etc. show up automatically on mobile)
 * but most desktop browsers don't support it at all — for those, opens
 * an explicit WhatsApp/Telegram/Copy Link menu instead of silently
 * falling back to clipboard-only, since WhatsApp and Telegram are the
 * actual primary distribution channels here, not an edge case.
 */
export function ShareButton({ title, url, quote, variant = 'icon', label = 'Share', target }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const text = quote
    ? `🎧 5 MINUTES FORWARD\n${title}\n\n"${quote}"\n\nListen here: ${url}`
    : `🎧 5 MINUTES FORWARD\n${title}\n\n${url}`;

  async function handleShare() {
    // Logged optimistically on share-sheet/menu open — not all browsers
    // confirm completion via the Web Share API's promise, so
    // share_initiated is the reliable baseline event (spec §X).
    if (target) logShareEvent(target, 'share_initiated');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        // `url` is already embedded in `text` above — passing both
        // causes some share targets (WhatsApp included) to append the
        // link a second time, since they don't dedupe text vs. url.
        await navigator.share({ title, text });
      } catch {
        // User cancelled the share sheet — not an error, do nothing.
      }
      return;
    }

    // No native share sheet (most desktop browsers) — offer explicit
    // channel choices instead.
    setShowMenu((s) => !s);
  }

  async function copyLink() {
    setShowMenu(false);
    try {
      await navigator.clipboard.writeText(text);
      if (target) logShareEvent(target, 'share_completed');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently no-op.
    }
  }

  function openChannel(channelUrl: string) {
    setShowMenu(false);
    if (target) logShareEvent(target, 'share_completed');
    window.open(channelUrl, '_blank', 'noopener,noreferrer');
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const telegramText = quote
    ? `🎧 5 MINUTES FORWARD\n${title}\n\n"${quote}"`
    : `🎧 5 MINUTES FORWARD\n${title}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(telegramText)}`;

  const buttonClassName =
    variant === 'labeled'
      ? 'inline-flex items-center gap-2 text-sm font-medium text-ink border border-line rounded-full px-4 py-2 hover:border-ink transition-colors'
      : 'w-9 h-9 flex items-center justify-center rounded-full hover:bg-navy-tint transition-colors shrink-0';

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleShare}
        aria-label={variant === 'icon' ? (copied ? 'Link copied' : label) : undefined}
        className={buttonClassName}
      >
        <ShareIcon />
        {variant === 'labeled' && (copied ? 'Link copied' : label)}
      </button>

      {showMenu && (
        <div className="absolute z-10 top-full mt-1 right-0 bg-surface border border-line rounded shadow-sm overflow-hidden w-40">
          <button
            type="button"
            onClick={() => openChannel(whatsappUrl)}
            className="block w-full px-3 py-2 text-sm text-left text-ink hover:bg-navy-tint"
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => openChannel(telegramUrl)}
            className="block w-full px-3 py-2 text-sm text-left text-ink hover:bg-navy-tint"
          >
            Telegram
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="block w-full px-3 py-2 text-sm text-left text-ink hover:bg-navy-tint"
          >
            {copied ? 'Copied ✓' : 'Copy Link'}
          </button>
        </div>
      )}
    </div>
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
