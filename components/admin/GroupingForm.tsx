'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GroupingFormProps {
  mode: 'create' | 'edit';
  groupingId?: string;
  initial?: {
    title: string;
    slug: string;
    description: string;
    type: 'series' | 'collection';
    status: 'ongoing' | 'completed' | '';
    isOrdered: boolean;
    artworkUrl: string;
    displayOrder: number | '';
    featured: boolean;
  };
}

const empty = {
  title: '',
  slug: '',
  description: '',
  type: 'series' as 'series' | 'collection',
  status: 'ongoing' as 'ongoing' | 'completed' | '',
  isOrdered: true,
  artworkUrl: '',
  displayOrder: '' as number | '',
  featured: false,
};

export function GroupingForm({ mode, groupingId, initial }: GroupingFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial ?? empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      type: form.type,
      status: form.type === 'series' ? form.status || 'ongoing' : null,
      isOrdered: form.isOrdered,
      artworkUrl: form.artworkUrl || null,
      displayOrder: form.displayOrder === '' ? null : Number(form.displayOrder),
      featured: form.featured,
    };

    try {
      const url = mode === 'create' ? '/api/admin/groupings' : `/api/admin/groupings/${groupingId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      router.push('/admin/groupings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2.5">{error}</p>}

      <Field label="Title">
        <input value={form.title} onChange={(e) => update('title', e.target.value)} className="input" />
      </Field>
      <Field label="Slug">
        <input value={form.slug} onChange={(e) => update('slug', e.target.value)} className="input" />
      </Field>
      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
          className="input resize-none"
        />
      </Field>

      <Field label="Type">
        <select
          value={form.type}
          onChange={(e) => {
            const type = e.target.value as 'series' | 'collection';
            update('type', type);
            update('isOrdered', type === 'series');
          }}
          className="input"
        >
          <option value="series">Series (sequential)</option>
          <option value="collection">Collection (topical, unordered)</option>
        </select>
      </Field>

      {form.type === 'series' && (
        <Field label="Status">
          <select value={form.status} onChange={(e) => update('status', e.target.value as any)} className="input">
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
      )}

      <Field label="Artwork URL (optional)">
        <input value={form.artworkUrl} onChange={(e) => update('artworkUrl', e.target.value)} className="input" />
      </Field>

      <Field label="Display order (optional)">
        <input
          type="number"
          value={form.displayOrder}
          onChange={(e) => update('displayOrder', e.target.value === '' ? '' : Number(e.target.value))}
          className="input"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.featured} onChange={(e) => update('featured', e.target.checked)} />
        Featured (drives the homepage featured card — only one grouping should be featured at a time)
      </label>

      <button
        type="submit"
        disabled={saving}
        className="self-start text-sm font-medium text-paper bg-ink rounded-full px-4 py-2 disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Save'}
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
