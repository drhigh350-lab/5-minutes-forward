import Link from 'next/link';
import { Episode, Grouping } from '@/lib/types';

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
          ← Day {prev.episodeNumber}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/${next.slug}`} className="text-muted hover:text-ink">
          Day {next.episodeNumber} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
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
