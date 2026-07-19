import { EpisodeForm } from '@/components/admin/EpisodeForm';

export default function NewEpisodePage() {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-6">New Episode</h1>
      <EpisodeForm mode="create" />
    </div>
  );
}
