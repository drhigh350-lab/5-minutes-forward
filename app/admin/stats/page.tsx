'use client';

import { useEffect, useState } from 'react';

interface EpisodeStat {
  episode_id: string;
  play_count: number;
  completion_count: number;
  completion_rate: number;
  avg_listen_seconds: number;
  share_count: number;
  is_popular: boolean;
}
interface GroupingStat {
  grouping_id: string;
  play_count: number;
  completion_count: number;
  completion_rate: number;
  avg_listen_seconds: number;
  share_count: number;
  is_popular: boolean;
}

export default function StatsPage() {
  const [episodeStats, setEpisodeStats] = useState<EpisodeStat[]>([]);
  const [groupingStats, setGroupingStats] = useState<GroupingStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        setEpisodeStats(d.episodeStats ?? []);
        setGroupingStats(d.groupingStats ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-2">Analytics</h1>
      <p className="text-sm text-muted mb-6">
        Populated by the scheduled aggregation job (not yet built — see README). Rows will be all-zero until then.
      </p>

      <h2 className="font-display text-lg text-ink mb-3">Episodes</h2>
      <StatsTable
        rows={episodeStats}
        idKey="episode_id"
      />

      <h2 className="font-display text-lg text-ink mt-8 mb-3">Groupings</h2>
      <StatsTable
        rows={groupingStats}
        idKey="grouping_id"
      />
    </div>
  );
}

function StatsTable<K extends string, T extends { play_count: number; completion_rate: number; avg_listen_seconds: number; share_count: number; is_popular: boolean } & Record<K, string>>({
  rows,
  idKey,
}: {
  rows: T[];
  idKey: K;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">No data yet.</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-mono uppercase text-muted border-b border-line">
          <th className="pb-2">ID</th>
          <th className="pb-2">Plays</th>
          <th className="pb-2">Completion</th>
          <th className="pb-2">Avg listen (s)</th>
          <th className="pb-2">Shares</th>
          <th className="pb-2">Popular</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[idKey])} className="border-b border-line">
            <td className="py-2 font-mono text-muted">{String(row[idKey]).slice(0, 8)}</td>
            <td className="py-2">{row.play_count}</td>
            <td className="py-2">{(row.completion_rate * 100).toFixed(0)}%</td>
            <td className="py-2">{Math.round(row.avg_listen_seconds)}</td>
            <td className="py-2">{row.share_count}</td>
            <td className="py-2">{row.is_popular ? '🔥' : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
