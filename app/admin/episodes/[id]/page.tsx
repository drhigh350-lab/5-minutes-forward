import { notFound } from 'next/navigation';
import { getEpisodeAdmin } from '@/lib/adminData';
import { EpisodeForm } from '@/components/admin/EpisodeForm';

export const runtime = 'edge';

// Next.js 15: page params are a Promise and must be awaited.
export default async function EditEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getEpisodeAdmin(id);
  if (!result) notFound();

  const { episode, groupingIds, topicIds } = result;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-6">Edit Episode</h1>
      <EpisodeForm
        mode="edit"
        episodeId={episode.id}
        initial={{
          episodeNumber: episode.episode_number,
          title: episode.title,
          slug: episode.slug,
          description: episode.description ?? '',
          quote: episode.quote ?? '',
          audioObjectKey: episode.audio_object_key,
          artworkUrl: episode.artwork_url ?? '',
          durationSeconds: episode.duration_seconds ?? 0,
          status: episode.status,
          featured: episode.featured,
          groupingIds,
          topicIds,
        }}
      />
    </div>
  );
}
