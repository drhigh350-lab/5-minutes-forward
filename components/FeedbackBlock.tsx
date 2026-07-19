'use client';

import { useState } from 'react';
import { createPublicClient } from '@/lib/supabase';
import { EMOJI_TO_REACTION } from '@/lib/dbMappers';

const REACTIONS = [
  { emoji: '💡', label: 'I learned something' },
  { emoji: '❤️', label: 'I needed this' },
  { emoji: '🤔', label: 'This made me think' },
  { emoji: '🔥', label: 'This hit home' },
] as const;

interface FeedbackBlockProps {
  episodeId: string;
}

/**
 * Spec §6: a single emoji tap is a complete, valid submission. No forced
 * text field, no visible name/email by default. Collapses to a quiet
 * thank-you rather than lingering as an open form. Writes a real row via
 * the "public insert feedback" RLS policy (anon can INSERT only).
 */
export function FeedbackBlock({ episodeId }: FeedbackBlockProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(emoji: string | null) {
    const supabase = createPublicClient();
    const reaction = emoji ? EMOJI_TO_REACTION[emoji] : null;

    const { error } = await supabase.from('feedback').insert({
      episode_id: episodeId,
      reaction,
      message: message.trim() || null,
      anonymous: true,
    });

    if (error && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[feedback] insert failed', error);
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="py-6 border-t border-line">
        <p className="text-sm text-muted">Thanks for sharing 🙏</p>
      </section>
    );
  }

  return (
    <section className="py-6 border-t border-line">
      <p className="text-sm text-ink mb-3">What did this episode make you think about?</p>

      <div className="flex items-center gap-3 mb-3">
        {REACTIONS.map((r) => (
          <button
            key={r.emoji}
            type="button"
            aria-label={r.label}
            onClick={() => submit(r.emoji)}
            className="text-2xl leading-none hover:scale-110 transition-transform"
          >
            {r.emoji}
          </button>
        ))}
      </div>

      {!showMore ? (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="text-xs text-muted underline decoration-line underline-offset-4"
        >
          Want to say more?
        </button>
      ) : (
        <div className="mt-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your thoughts..."
            rows={3}
            className="w-full text-sm border border-line rounded p-2.5 text-ink placeholder:text-muted focus:border-ink outline-none resize-none"
          />
          <button
            type="button"
            onClick={() => submit(null)}
            disabled={!message.trim()}
            className="mt-2 text-sm font-medium text-paper bg-ink rounded-full px-4 py-1.5 disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      )}
    </section>
  );
}
