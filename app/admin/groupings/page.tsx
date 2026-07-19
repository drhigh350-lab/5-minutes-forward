'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface GroupingListItem {
  id: string;
  title: string;
  type: 'series' | 'collection';
  status: 'ongoing' | 'completed' | null;
  featured: boolean;
}

export default function GroupingsListPage() {
  const [groupings, setGroupings] = useState<GroupingListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/groupings')
      .then((r) => r.json())
      .then((d) => setGroupings(d.groupings ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-ink">Groupings</h1>
        <Link href="/admin/groupings/new" className="text-sm font-medium text-paper bg-ink rounded-full px-4 py-2">
          + New Grouping
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : groupings.length === 0 ? (
        <p className="text-sm text-muted">No groupings yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {groupings.map((g) => (
            <li key={g.id} className="py-3 flex items-center justify-between">
              <Link href={`/admin/groupings/${g.id}`} className="text-ink hover:underline">
                {g.title}
              </Link>
              <span className="text-xs text-muted font-mono">
                {g.type}
                {g.status ? ` · ${g.status}` : ''}
                {g.featured ? ' · ★ featured' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
