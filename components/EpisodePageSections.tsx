import Link from 'next/link';
import { Episode, Grouping } from '@/lib/types';
import { RelatedEpisode } from '@/lib/data';
import { formatDuration } from '@/lib/formatters';

interface PrevNextProps {
  prev: Episode | null;
  next: Episode | null;
}

/** Sequential-series-only nav (spec §3) — hidden entirely when the episode isn't in an ordered grouping. */
export function PrevNextNav({ prev, next }: PrevNextProps) {
  if (!prev && !next) return null;

  return (
    <nav className="flex items-center justify-between py-4 text-sm">
      {prev ? (
        <Link href={`/${prev.slug}`} className="text-muted hover:text-ink">
          ← Episode {prev.episodeNumber}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/${next.slug}`} className="text-muted hover:text-ink">
          Episode {next.episodeNumber} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/**
 * Collapsed by default via plain <details>/<summary> — no JS needed,
 * and the content is still present in the server-rendered HTML either
 * way, so it stays crawlable regardless of open/closed state. Skipped
 * entirely on the page when there's no transcript (see app/[slug]) —
 * this component doesn't need its own empty-state handling.
 */
export function Transcript({ text }: { text: string }) {
  return (
    <section className="py-4 border-t border-line">
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-ink list-none flex items-center gap-1.5">
          <span className="transition-transform group-open:rotate-90">▸</span>
          Read transcript
        </summary>
        <div className="mt-3 text-sm text-muted whitespace-pre-wrap leading-relaxed">{text}</div>
      </details>
    </section>
  );
}

/** Deterministic, topic/grouping-based related episodes (spec §12) — no recommendation engine. */
export function RelatedEpisodes({ episodes }: { episodes: RelatedEpisode[] }) {
  if (episodes.length === 0) return null;

  return (
    <section className="py-6 border-t border-line">
      <p className="eyebrow mb-3">Related Episodes</p>
      <ul>
        {episodes.map((ep) => (
          <li key={ep.slug} className="border-b border-line last:border-b-0">
            <Link href={`/${ep.slug}`} className="flex items-start py-3.5 group">
              <span className="font-mono text-xs text-muted shrink-0 w-24 pt-0.5">Episode {ep.episodeNumber}</span>
              <span className="flex-1 min-w-0 pr-3 text-ink group-hover:underline decoration-line underline-offset-4 whitespace-normal break-words">
                {ep.title}
              </span>
              <span className="font-mono text-xs text-muted shrink-0 w-12 text-right pt-0.5">
                {formatDuration(ep.durationSeconds)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GroupingPointer({ grouping }: { grouping: Grouping }) {
  const label = grouping.type === 'series' ? 'Series' : 'Collection';
  const cta = grouping.type === 'series' ? 'Continue Series' : 'More from this collection';

  return (
    <section className="py-4 border-t border-line flex items-center justify-between text-sm">
      <span className="text-muted">
        {label}: <span className="text-ink">{grouping.title}</span>
      </span>
      <Link href={`/series/${grouping.slug}`} className="text-ink underline decoration-line underline-offset-4">
        {cta} →
      </Link>
    </section>
  );
}

/** Lets a WhatsApp-arrival visitor discover the rest of the platform without competing with Play (spec §3). */
export function ExploreMoreCard() {
  return (
    <section className="py-6 border-t border-line">
      <p className="eyebrow mb-3">Explore more on 5 Minutes Forward</p>
      <div className="flex flex-col gap-2 text-sm">
        <Link href="/" className="text-ink underline decoration-line underline-offset-4">
          See today&rsquo;s episode
        </Link>
        <Link href="/series" className="text-ink underline decoration-line underline-offset-4">
          Browse series &amp; collections
        </Link>
        <Link href="/collective" className="text-ink underline decoration-line underline-offset-4">
          Join the Forward Collective
        </Link>
      </div>
    </section>
  );
}
