'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Grouping } from '@/lib/types';
import { SeriesProgressRing } from './PlayDial';
import { ShareButton } from './ShareButton';
import { getPlayedEpisodeIds } from '@/lib/localProgress';

interface Props {
  grouping: Grouping;
  memberEpisodeIds: string[];
}

/**
 * "Completed" is inherently per-visitor data with no account system
 * (spec §5 — local storage only), so it can't be computed server-side.
 * This reads the same `5mf_played_episode_ids` set the autoplay
 * resolver uses, intersected against this grouping's members.
 */
export function FeaturedGrouping({ grouping, memberEpisodeIds }: Props) {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const played = getPlayedEpisodeIds();
    setCompleted(memberEpisodeIds.filter((id) => played.has(id)).length);
  }, [memberEpisodeIds]);

  const cta = completed > 0 ? 'Continue Series' : 'Start Series';

  return (
    <section className="py-6 border-t border-line">
      <p className="eyebrow mb-3">Featured</p>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl text-ink mb-1">{grouping.title}</h3>
          <p className="text-sm text-muted mb-3">{grouping.episodeCount} episodes</p>
          <SeriesProgressRing completed={completed} total={grouping.episodeCount} />
        </div>
        <ShareButton
          title={grouping.title}
          url={`https://forward.techmedng.com/series/${grouping.slug}`}
          variant="icon"
          target={{ groupingId: grouping.id }}
        />
      </div>
      <Link
        href={`/series/${grouping.slug}`}
        className="inline-block mt-4 text-sm font-medium text-ink border border-ink rounded-full px-4 py-2 hover:bg-ink hover:text-paper transition-colors"
      >
        {cta}
      </Link>
    </section>
  );
}
