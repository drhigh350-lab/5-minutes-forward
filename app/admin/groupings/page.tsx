'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Grouping {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string | null;
  is_ordered: boolean;
  featured: boolean;
}

export default function GroupingsPage() {
  const [groupings, setGroupings] = useState<Grouping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/groupings')
      .then((res) => res.json())
      .then((data) => {
        setGroupings(data.groupings ?? []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-ink">
          Groupings
        </h1>

        <Link
          href="/admin/groupings/new"
          className="text-sm font-medium text-paper bg-ink rounded-full px-4 py-2"
        >
          + New Grouping
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : groupings.length === 0 ? (
        <p className="text-sm text-muted">
          No groupings yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {groupings.map((grouping) => (
            <Link
              key={grouping.id}
              href={`/admin/groupings/${grouping.id}`}
              className="block border border-line rounded-lg p-4 hover:border-ink transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">
                    {grouping.title}
                  </p>

                  <p className="text-sm text-muted">
                    /{grouping.slug}
                  </p>
                </div>

                <div className="text-right text-xs text-muted">
                  <p>{grouping.type}</p>
                  <p>{grouping.status ?? 'draft'}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
