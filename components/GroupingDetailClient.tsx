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

      <ul className="divide-y divide-line pb-8">
        {episodes.map((ep) => (
          <li key={ep.slug}>
            <Link href={`/${ep.slug}`} className="flex items-center justify-between py-4 group">
              <span className="flex items-baseline gap-3 min-w-0">
                <span className="font-mono text-xs text-muted shrink-0">Day {ep.episodeNumber}</span>
                <span className="text-ink group-hover:underline decoration-line underline-offset-4 truncate">
                  {ep.title}
                </span>
                {played.has(ep.id) && (
                  <span className="text-gold shrink-0" aria-label="Played">
                    ✓
                  </span>
                )}
              </span>
              <span className="font-mono text-xs text-muted shrink-0 ml-3">
                {formatDuration(ep.durationSeconds)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
