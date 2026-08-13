'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EpisodeListItem {
  id: string;
  episode_number: number;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  featured: boolean;
  duration_seconds: number | null;
}

export default function EpisodesListPage() {
  const [episodes, setEpisodes] = useState<EpisodeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/episodes')
      .then((r) => r.json())
      .then((d) => setEpisodes(d.episodes ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(ep: EpisodeListItem) {
    if (!window.confirm(`Delete "${ep.title}"? This permanently removes the episode, including any feedback and stats tied to it — this cannot be undone.`)) {
      return;
    }
    setDeletingId(ep.id);
    try {
      const res = await fetch(`/api/admin/episodes/${ep.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      setEpisodes((prev) => prev.filter((e) => e.id !== ep.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-ink">Episodes</h1>
        <Link
          href="/admin/episodes/new"
          className="text-sm font-medium text-paper bg-ink rounded-full px-4 py-2"
        >
          + New Episode
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : episodes.length === 0 ? (
        <p className="text-sm text-muted">No episodes yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-mono uppercase text-muted border-b border-line">
              <th className="pb-2">Episode</th>
              <th className="pb-2">Title</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Featured</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {episodes.map((ep) => (
              <tr key={ep.id} className="border-b border-line">
                <td className="py-2 font-mono text-muted align-top">{ep.episode_number}</td>
                <td className="py-2 align-top">
                  <Link href={`/admin/episodes/${ep.id}`} className="text-ink hover:underline">
                    {ep.title}
                  </Link>
                </td>
                <td className="py-2 align-top">
                  <span
                    className={
                      ep.status === 'published' ? 'text-green-700' : 'text-muted'
                    }
                  >
                    {ep.status}
                  </span>
                </td>
                <td className="py-2 text-muted align-top">{ep.featured ? '★' : ''}</td>
                <td className="py-2 align-top text-right">
                  <button
                    type="button"
                    onClick={() => handleDelete(ep)}
                    disabled={deletingId === ep.id}
                    className="text-xs text-red-600 hover:underline disabled:opacity-40"
                  >
                    {deletingId === ep.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
