import Link from 'next/link';
import { formatDuration } from '@/lib/formatters';

interface PlayDialProps {
  label: string; // e.g. "Play" or "Continue"
  durationSeconds?: number;
  progressFraction?: number; // 0–1, defaults to 0 (unplayed)
  size?: number;
  onClick?: () => void; // use for in-place playback control (episode page, mini-player)
  href?: string; // use for navigation (homepage hero → episode page)
  isPlaying?: boolean; // swaps the icon to a pause glyph when true
}

/**
 * The brand's signature element: a ring standing in for "5 minutes" —
 * a timer face reduced to its simplest form. Used here as the play
 * button; the same ring motif (see SeriesProgressRing below) represents
 * series completion, so the visual language of "a ring filling up" means
 * one consistent thing everywhere on the site: progress toward finishing
 * something small.
 *
 * Gold is used ONLY on this ring — nowhere else on the page — so it stays
 * meaningful rather than decorative.
 *
 * Renders as a <Link> when `href` is given (homepage → episode page
 * navigation) or a <button> when `onClick` is given (in-place playback
 * control) — never both, to avoid nesting interactive elements.
 */
export function PlayDial({
  label,
  durationSeconds,
  progressFraction = 0,
  size = 88,
  onClick,
  href,
  isPlaying = false,
}: PlayDialProps) {
  const stroke = 3;
  const radius = size / 2 - stroke * 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - progressFraction);
  const ariaLabel = durationSeconds ? `${label}, ${formatDuration(durationSeconds)}` : label;

  const dial = (
    <>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E4E4E0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#C99A3B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <span className="absolute inset-[10px] rounded-full bg-ink flex items-center justify-center transition-colors group-hover:bg-ink-soft">
        {isPlaying ? (
          <svg width={size * 0.26} height={size * 0.26} viewBox="0 0 24 24">
            <rect x="5" y="4" width="5" height="16" fill="#F7F7F5" />
            <rect x="14" y="4" width="5" height="16" fill="#F7F7F5" />
          </svg>
        ) : (
          // Play triangle, nudged 1px right to look optically centered
          <svg width={size * 0.28} height={size * 0.28} viewBox="0 0 24 24" className="ml-[3px]">
            <path d="M6 4L20 12L6 20V4Z" fill="#F7F7F5" />
          </svg>
        )}
      </span>
    </>
  );

  const sharedClassName =
    'group relative inline-flex items-center justify-center rounded-full transition-transform active:scale-[0.97]';

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={sharedClassName} style={{ width: size, height: size }}>
        {dial}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={sharedClassName}
      style={{ width: size, height: size }}
      aria-label={ariaLabel}
    >
      {dial}
    </button>
  );
}

interface SeriesProgressRingProps {
  completed: number;
  total: number;
  size?: number;
}

/** Same ring language, used for "3 of 5 episodes completed" instead of dots. */
export function SeriesProgressRing({ completed, total, size = 28 }: SeriesProgressRingProps) {
  const stroke = 2.5;
  const radius = size / 2 - stroke * 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? completed / total : 0;
  const dashoffset = circumference * (1 - fraction);

  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E4E4E0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#C99A3B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>
      <span className="font-mono text-xs text-muted">
        {completed} of {total} completed
      </span>
    </span>
  );
}
