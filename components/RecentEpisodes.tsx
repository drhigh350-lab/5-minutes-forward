import Link from 'next/link';
import { formatDuration } from '@/lib/formatters';

interface EpisodeTeaser {
  episodeNumber: number;
  title: string;
  slug: string;
  durationSeconds: number;
}

export function RecentEpisodes({ episodes }: { episodes: EpisodeTeaser[] }) {
  return (
    <section className="py-6 border-t border-line">
      <p className="eyebrow mb-3">All Episodes</p>
      <ul className="divide-y divide-line">
        {episodes.map((ep) => (
          <li key={ep.slug}>
            <Link
              href={`/${ep.slug}`}
              className="flex items-center justify-between py-3 group"
            >
              <span className="flex items-baseline gap-3 min-w-0">
                <span className="font-mono text-xs text-muted shrink-0">
                  Day {ep.episodeNumber}
                </span>
                <span className="text-ink group-hover:underline decoration-line underline-offset-4 truncate">
                  {ep.title}
                </span>
              </span>
              <span className="font-mono text-xs text-muted shrink-0 ml-3">
                {formatDuration(ep.durationSeconds)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/episodes"
        className="inline-block mt-3 text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
      >
        See all episodes →
      </Link>
    </section>
  );
}
