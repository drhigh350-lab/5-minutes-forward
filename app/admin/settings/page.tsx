'use client';

import { useEffect, useState } from 'react';

interface GroupingOption {
  id: string;
  title: string;
}

export default function SettingsPage() {
  const [collectiveInviteUrl, setCollectiveInviteUrl] = useState('');
  const [whatsappChannelUrl, setWhatsappChannelUrl] = useState('');
  const [featuredGroupingId, setFeaturedGroupingId] = useState('');
  const [groupings, setGroupings] = useState<GroupingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
      fetch('/api/admin/groupings').then((r) => r.json()),
    ]).then(([settingsData, groupingsData]) => {
      const s = settingsData.settings;
      setCollectiveInviteUrl(s?.collective_invite_url ?? '');
      setWhatsappChannelUrl(s?.whatsapp_channel_url ?? '');
      setFeaturedGroupingId(s?.featured_grouping_id ?? '');
      setGroupings((groupingsData.groupings ?? []).map((g: any) => ({ id: g.id, title: g.title })));
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectiveInviteUrl: collectiveInviteUrl || null,
        whatsappChannelUrl: whatsappChannelUrl || null,
        featuredGroupingId: featuredGroupingId || null,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink mb-6">Site Settings</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4 max-w-lg">
        <Field label="Forward Collective invite URL">
          <input
            value={collectiveInviteUrl}
            onChange={(e) => setCollectiveInviteUrl(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="WhatsApp Channel URL">
          <input value={whatsappChannelUrl} onChange={(e) => setWhatsappChannelUrl(e.target.value)} className="input" />
        </Field>
        <Field label="Featured grouping">
          <select value={featuredGroupingId} onChange={(e) => setFeaturedGroupingId(e.target.value)} className="input">
            <option value="">— None —</option>
            {groupings.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          className="self-start text-sm font-medium text-paper bg-ink rounded-full px-4 py-2"
        >
          {saved ? 'Saved ✓' : 'Save Settings'}
        </button>

        <style jsx>{`
          .input {
            border: 1px solid #e4e4e0;
            border-radius: 6px;
            padding: 8px 10px;
            color: #14213d;
            width: 100%;
          }
          .input:focus {
            outline: none;
            border-color: #14213d;
          }
        `}</style>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-mono uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
