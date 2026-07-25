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

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface FeedbackBlockProps {
  episodeId: string;
}

/**
 * Spec §6: a single emoji tap is a complete, valid submission — but
 * reacting and writing a thought are tracked as two independent actions
 * that both stay visible the whole time. Reacting never hides the
 * "want to say more" option, and writing a thought never requires
 * re-doing the reaction. Only a genuine DB failure shows an error;
 * a failed insert no longer silently renders a false "Thanks" state.
 *
 * Writes real rows via the "public insert feedback" RLS policy (anon
 * can INSERT only, no UPDATE) — so if the reaction and a message are
 * both present when either is submitted, they're combined into one
 * row; otherwise each is its own row, keyed to the same episode.
 */
export function FeedbackBlock({ episodeId }: FeedbackBlockProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [reactionState, setReactionState] = useState<SaveState>('idle');

  const [showMessageInput, setShowMessageInput] = useState(false);
  const [message, setMessage] = useState('');
  const [messageState, setMessageState] = useState<SaveState>('idle');

  async function insertFeedback(reaction: string | null, msg: string | null) {
    const supabase = createPublicClient();
    const { error } = await supabase.from('feedback').insert({
      episode_id: episodeId,
      reaction,
      message: msg,
      anonymous: true,
    });
    return error;
  }

  async function handleReactionTap(emoji: string) {
    if (reactionState === 'saving' || reactionState === 'saved') return;

    setSelectedEmoji(emoji);
    setReactionState('saving');

    // If the message box is already open with unsent text, combine both
    // into a single row instead of writing two.
    const pendingMessage = showMessageInput && messageState !== 'saved' ? message.trim() : '';

    const error = await insertFeedback(EMOJI_TO_REACTION[emoji], pendingMessage || null);

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[feedback] reaction insert failed', error);
      }
      setReactionState('error');
      return;
    }

    setReactionState('saved');
    if (pendingMessage) setMessageState('saved');
  }

  async function handleMessageSubmit() {
    const trimmed = message.trim();
    if (!trimmed || messageState === 'saving' || messageState === 'saved') return;

    setMessageState('saving');

    // Only attach the reaction here if it hasn't already been saved as
    // its own row — avoids double-counting it.
    const reactionToAttach =
      selectedEmoji && reactionState !== 'saved' ? EMOJI_TO_REACTION[selectedEmoji] : null;

    const error = await insertFeedback(reactionToAttach, trimmed);

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[feedback] message insert failed', error);
      }
      setMessageState('error');
      return;
    }

    setMessageState('saved');
    if (reactionToAttach) setReactionState('saved');
  }

  const selectedLabel = REACTIONS.find((r) => r.emoji === selectedEmoji)?.label;

  return (
    <section className="py-6 border-t border-line">
      <p className="text-sm text-ink mb-3">What did this episode make you think about?</p>

      <div className="flex items-center gap-3 mb-2">
        {REACTIONS.map((r) => {
          const isSelected = selectedEmoji === r.emoji;
          const isDisabled = reactionState === 'saving' || reactionState === 'saved';
          return (
            <button
              key={r.emoji}
              type="button"
              aria-label={r.label}
              aria-pressed={isSelected}
              onClick={() => handleReactionTap(r.emoji)}
              disabled={isDisabled && !isSelected}
              className={`text-2xl leading-none transition-transform ${
                isSelected
                  ? 'scale-125'
                  : isDisabled
                    ? 'opacity-30'
                    : 'hover:scale-110'
              }`}
            >
              {r.emoji}
            </button>
          );
        })}
      </div>

      {/* Reaction save state — always in place of the emoji row, never replacing it */}
      {reactionState === 'saving' && <p className="text-xs text-muted mb-3">Saving your reaction…</p>}
      {reactionState === 'saved' && (
        <p className="text-xs text-muted mb-3">{selectedLabel} — recorded ✓</p>
      )}
      {reactionState === 'error' && (
        <p className="text-xs mb-3">
          <span className="text-red-600">Couldn&rsquo;t save that.</span>{' '}
          <button
            type="button"
            onClick={() => selectedEmoji && handleReactionTap(selectedEmoji)}
            className="text-muted underline decoration-line underline-offset-4"
          >
            Try again
          </button>
        </p>
      )}

      {/* Message — independent of reaction state, so reacting never hides this */}
      {messageState === 'saved' ? (
        <p className="text-xs text-muted">Thanks for sharing your thoughts too 🙏</p>
      ) : !showMessageInput ? (
        <button
          type="button"
          onClick={() => setShowMessageInput(true)}
          className="text-xs text-muted underline decoration-line underline-offset-4"
        >
          Want to say more?
        </button>
      ) : (
        <div className="mt-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your thoughts..."
            rows={3}
            disabled={messageState === 'saving'}
            className="w-full text-sm border border-line rounded p-2.5 text-ink placeholder:text-muted focus:border-ink outline-none resize-none disabled:opacity-60"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleMessageSubmit}
              disabled={!message.trim() || messageState === 'saving'}
              className="text-sm font-medium text-paper bg-ink rounded-full px-4 py-1.5 disabled:opacity-40"
            >
              {messageState === 'saving' ? 'Saving…' : 'Submit'}
            </button>
            {messageState === 'error' && (
              <span className="text-xs text-red-600">Couldn&rsquo;t save — try again</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
