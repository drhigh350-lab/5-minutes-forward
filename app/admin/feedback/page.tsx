'use client';

import { useEffect, useState } from 'react';

const REACTION_EMOJI: Record<string, string> = {
  insight: '💡',
  love: '❤️',
  thinking: '🤔',
  fire: '🔥',
};

interface FeedbackItem {
  id: string;
  episode_id: string | null;
  reaction: string | null;
  message: string | null;
  name: string | null;
  anonymous: boolean;
  created_at: string;
}

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/feedback')
      .then((r) => r.json())
      .then((d) => setItems(d.feedback ?? []))
      .finally(() => setLoading(false));
  }, []);

  const totals = items.reduce<Record<string, number>>((acc, item) => {
    if (item.reaction) acc[item.reaction] = (acc[item.reaction] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-4">Feedback</h1>

      {!loading && items.length > 0 && (
        <p className="text-sm text-muted mb-6">
          {Object.entries(totals)
            .map(([reaction, count]) => `${REACTION_EMOJI[reaction] ?? reaction} ${count}`)
            .join('   ')}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No feedback yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex items-center gap-2 text-sm">
                {item.reaction && <span>{REACTION_EMOJI[item.reaction]}</span>}
                <span className="text-muted text-xs font-mono">
                  {item.episode_id ? `Episode ${item.episode_id.slice(0, 8)}` : 'General'} ·{' '}
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              {item.message && <p className="text-ink mt-1">{item.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
