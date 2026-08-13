'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Episode, Grouping } from '@/lib/types';
import { SeriesProgressRing } from './PlayDial';
import { getPlayedEpisodeIds } from '@/lib/localProgress';
import { formatDuration } from '@/lib/formatters';

/**
 * "Completed" is per-visitor local-only data (spec §5), same pattern as
 * FeaturedGrouping on the homepage — read here too so the series/
 * collection detail page can show the same progress ring plus a
 * per-episode played checkmark.
 */
export function GroupingDetailClient({ grouping, episodes }: { grouping: Grouping; episodes: Episode[] }) {
  const [played, setPlayed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPlayed(getPlayedEpisodeIds());
  }, []);

  const completed = episodes.filter((ep) => played.has(ep.id)).length;

  return (
    <>
      {grouping.type === 'series' && episodes.length > 0 && (
        <div className="mb-6">
          <SeriesProgressRing completed={completed} total={episodes.length} />
        </div>
      )}

      <ul className="pb-8">
        {episodes.map((ep) => (
          <li key={ep.slug} className="border-b border-line last:border-b-0">
            <Link href={`/${ep.slug}`} className="flex items-start py-3.5 group">
              <span className="font-mono text-xs text-muted shrink-0 w-20 pt-0.5">Day {ep.episodeNumber}</span>
              <span className="flex-1 min-w-0 pr-3 flex items-baseline gap-2 flex-wrap">
                <span className="text-ink group-hover:underline decoration-line underline-offset-4 whitespace-normal break-words">
                  {ep.title}
                </span>
                {played.has(ep.id) && (
                  <span className="text-gold shrink-0" aria-label="Played">
                    ✓
                  </span>
                )}
              </span>
              <span className="font-mono text-xs text-muted shrink-0 w-12 text-right pt-0.5">
                {formatDuration(ep.durationSeconds)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
