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
      <ul>
        {episodes.map((ep) => (
          <li key={ep.slug} className="border-b border-line last:border-b-0">
            <Link href={`/${ep.slug}`} className="flex items-start py-3.5 group">
              <span className="font-mono text-xs text-muted shrink-0 w-24 pt-0.5">
                Episode {ep.episodeNumber}
              </span>
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
      <Link
        href="/episodes"
        className="inline-block mt-3 text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
      >
        See all episodes →
      </Link>
    </section>
  );
}
