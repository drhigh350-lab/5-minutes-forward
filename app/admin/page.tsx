import Link from 'next/link';

const CARDS = [
  { href: '/admin/episodes/new', title: 'New Episode', desc: 'Record → upload → publish.' },
  { href: '/admin/episodes', title: 'All Episodes', desc: 'Edit, feature, or unpublish.' },
  { href: '/admin/groupings', title: 'Groupings', desc: 'Series and topical collections.' },
  { href: '/admin/feedback', title: 'Feedback', desc: 'What listeners are saying.' },
  { href: '/admin/stats', title: 'Analytics', desc: 'Plays, completion, shares.' },
  { href: '/admin/settings', title: 'Settings', desc: 'Collective + WhatsApp links.' },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-6">5 Minutes Forward — Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block border border-line rounded-lg p-4 hover:border-ink transition-colors"
          >
            <p className="text-ink font-medium mb-1">{c.title}</p>
            <p className="text-sm text-muted">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
