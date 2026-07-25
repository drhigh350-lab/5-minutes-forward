'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GroupingOption {
  id: string;
  title: string;
  is_ordered: boolean;
}
interface TopicOption {
  id: string;
  name: string;
}

interface EpisodeFormProps {
  mode: 'create' | 'edit';
  episodeId?: string;
  initial?: {
    episodeNumber: number;
    title: string;
    slug: string;
    description: string;
    quote: string;
    audioObjectKey: string;
    artworkUrl: string;
    durationSeconds: number;
    status: 'draft' | 'published';
    featured: boolean;
    groupingIds: { groupingId: string; position: number | null }[];
    topicIds: string[];
  };
}

const emptyForm = {
  episodeNumber: 1,
  title: '',
  slug: '',
  description: '',
  quote: '',
  audioObjectKey: '',
  artworkUrl: '',
  durationSeconds: 0,
  status: 'draft' as 'draft' | 'published',
  featured: false,
};

export function EpisodeForm({ mode, episodeId, initial }: EpisodeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial ?? emptyForm);
  const [groupingIds, setGroupingIds] = useState<Record<string, number | null | false>>(
    Object.fromEntries((initial?.groupingIds ?? []).map((g) => [g.groupingId, g.position]))
  );
  const [topicIds, setTopicIds] = useState<Set<string>>(new Set(initial?.topicIds ?? []));

  const [groupingOptions, setGroupingOptions] = useState<GroupingOption[]>([]);
  const [topicOptions, setTopicOptions] = useState<TopicOption[]>([]);
  const [newTopicName, setNewTopicName] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedResult, setPublishedResult] = useState<{ slug: string; title: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/groupings')
      .then((r) => r.json())
      .then((d) => setGroupingOptions((d.groupings ?? []).map((g: any) => ({ id: g.id, title: g.title, is_ordered: g.is_ordered }))));
    fetch('/api/admin/topics')
      .then((r) => r.json())
      .then((d) => setTopicOptions((d.topics ?? []).map((t: any) => ({ id: t.id, name: t.name }))));

    if (mode === 'create') {
      fetch('/api/admin/episodes')
        .then((r) => r.json())
        .then((d) => {
          if (d.nextEpisodeNumber) {
            setForm((f) => ({ ...f, episodeNumber: d.nextEpisodeNumber, slug: `ep${d.nextEpisodeNumber}` }));
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleEpisodeNumberChange(n: number) {
    setForm((f) => ({ ...f, episodeNumber: n, slug: mode === 'create' ? `ep${n}` : f.slug }));
  }

  async function handleAudioUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      // Auto-detect duration client-side (spec §10.1 — "one less field,
      // one less chance of a wrong number") before uploading.
      const duration = await readAudioDuration(file);

      const res = await fetch('/api/admin/audio-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const { uploadUrl, objectKey, error: uploadUrlError } = await res.json();
      if (!res.ok) throw new Error(uploadUrlError || 'Could not get upload URL');

let putRes: Response;

try {
  putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
} catch (err) {
  throw new Error(
    `R2 upload request failed: ${
      err instanceof Error ? err.message : String(err)
    }`
  );
}

if (!putRes.ok) {
  const responseText = await putRes.text().catch(() => '');

  throw new Error(
    `R2 upload failed with status ${putRes.status}${
      responseText ? `: ${responseText}` : ''
    }`
  );
}
      setForm((f) => ({ ...f, audioObjectKey: objectKey, durationSeconds: Math.round(duration) }));
      setUploadedFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function toggleGrouping(id: string, isOrdered: boolean) {
    setGroupingIds((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = isOrdered ? 1 : null;
      }
      return next;
    });
  }

  function setGroupingPosition(id: string, position: number) {
    setGroupingIds((prev) => ({ ...prev, [id]: position }));
  }

  function toggleTopic(id: string) {
    setTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addTopic() {
    if (!newTopicName.trim()) return;
    const slug = newTopicName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const res = await fetch('/api/admin/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTopicName.trim(), slug }),
    });
    const data = await res.json();
    if (res.ok) {
      setTopicOptions((prev) => [...prev, { id: data.id, name: newTopicName.trim() }]);
      setTopicIds((prev) => new Set(prev).add(data.id));
      setNewTopicName('');
    }
  }

  async function handleSubmit(e: React.FormEvent, publishNow: boolean) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      episodeNumber: form.episodeNumber,
      title: form.title,
      slug: form.slug,
      description: form.description,
      quote: form.quote,
      audioObjectKey: form.audioObjectKey,
      artworkUrl: form.artworkUrl || null,
      durationSeconds: form.durationSeconds || null,
      status: publishNow ? 'published' : 'draft',
      featured: form.featured,
      groupingIds: Object.entries(groupingIds).map(([groupingId, position]) => ({
        groupingId,
        position: position === false ? null : position,
      })),
      topicIds: [...topicIds],
    };

    try {
      const url = mode === 'create' ? '/api/admin/episodes' : `/api/admin/episodes/${episodeId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      if (publishNow) {
        setPublishedResult({ slug: form.slug, title: form.title });
      } else {
        router.push('/admin/episodes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (publishedResult) {
    return <PublishConfirmation episodeNumber={form.episodeNumber} slug={publishedResult.slug} title={publishedResult.title} />;
  }

  return (
    <form onSubmit={(e) => handleSubmit(e, form.status === 'published')} className="flex flex-col gap-5 max-w-2xl">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2.5">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Episode number">
          <input
            type="number"
            value={form.episodeNumber}
            onChange={(e) => handleEpisodeNumberChange(Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Slug">
          <input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="Title">
        <input value={form.title} onChange={(e) => updateField('title', e.target.value)} className="input" />
      </Field>

      <Field label="Quote">
        <input value={form.quote} onChange={(e) => updateField('quote', e.target.value)} className="input" />
      </Field>

      <Field label="Description">
        <textarea
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          rows={3}
          className="input resize-none"
        />
      </Field>

      <Field label="Audio file">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
        />
        {uploading && <p className="text-xs text-muted mt-1">Uploading…</p>}
        {form.audioObjectKey && !uploading && (
          <p className="text-xs text-muted mt-1">
            ✓ {uploadedFileName || form.audioObjectKey} — {Math.round(form.durationSeconds)}s detected
          </p>
        )}
      </Field>

      <Field label="Artwork URL (optional)">
        <input value={form.artworkUrl} onChange={(e) => updateField('artworkUrl', e.target.value)} className="input" />
      </Field>

      <Field label="Series / Collections">
        <div className="flex flex-col gap-2 border border-line rounded p-3">
          {groupingOptions.length === 0 && <p className="text-xs text-muted">No groupings yet — create one first.</p>}
          {groupingOptions.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={g.id in groupingIds}
                onChange={() => toggleGrouping(g.id, g.is_ordered)}
              />
              <span className="text-ink flex-1">{g.title}</span>
              {g.is_ordered && g.id in groupingIds && (
                <input
                  type="number"
                  min={1}
                  value={(groupingIds[g.id] as number) || 1}
                  onChange={(e) => setGroupingPosition(g.id, Number(e.target.value))}
                  className="w-16 border border-line rounded px-1.5 py-0.5 text-xs"
                  placeholder="pos"
                />
              )}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Topics">
        <div className="flex flex-col gap-2 border border-line rounded p-3">
          {topicOptions.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={topicIds.has(t.id)} onChange={() => toggleTopic(t.id)} />
              <span className="text-ink">{t.name}</span>
            </label>
          ))}
          <div className="flex gap-2 mt-1">
            <input
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="New topic name"
              className="input text-sm flex-1"
            />
            <button type="button" onClick={addTopic} className="text-xs text-ink border border-line rounded px-2">
              Add
            </button>
          </div>
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} />
        Featured
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={saving}
          onClick={(e) => handleSubmit(e as any, false)}
          className="text-sm font-medium text-ink border border-line rounded-full px-4 py-2 disabled:opacity-40"
        >
          Save Draft
        </button>
        <button
          type="button"
          disabled={saving || !form.audioObjectKey}
          onClick={(e) => handleSubmit(e as any, true)}
          className="text-sm font-medium text-paper bg-ink rounded-full px-4 py-2 disabled:opacity-40"
        >
          Publish
        </button>
      </div>

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

/** Reads audio file duration client-side without uploading it first. */
function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    audio.onerror = () => reject(new Error('Could not read audio duration'));
    audio.src = URL.createObjectURL(file);
  });
}

/** Post-publish screen (spec §10.2) — the WhatsApp copy-paste workflow. */
function PublishConfirmation({ episodeNumber, slug, title }: { episodeNumber: number; slug: string; title: string }) {
  const url = `https://forward.techmedng.com/${slug}`;
  const template = `🎧 5 MINUTES FORWARD — DAY ${episodeNumber}\n${title}\n\nListen here:\n${url}\n\nIf this speaks to you, share it with someone who needs it.`;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  return (
    <div className="max-w-lg">
      <p className="text-ink font-medium mb-1">✅ Episode {episodeNumber} published</p>
      <p className="text-sm text-muted mb-6">Live at {url}</p>

      <div className="flex flex-col gap-2">
        <CopyRow label="Copy Episode Link" onClick={() => copy('link', url)} copied={copiedKey === 'link'} />
        <CopyRow label="Copy WhatsApp Promotion Text" onClick={() => copy('wa', template)} copied={copiedKey === 'wa'} />
        <CopyRow label="Copy Title" onClick={() => copy('title', title)} copied={copiedKey === 'title'} />
      </div>

      <a href="/admin/episodes" className="inline-block mt-6 text-sm text-muted underline">
        Back to all episodes
      </a>
    </div>
  );
}

function CopyRow({ label, onClick, copied }: { label: string; onClick: () => void; copied: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left text-sm border border-line rounded px-3 py-2 hover:border-ink"
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}
