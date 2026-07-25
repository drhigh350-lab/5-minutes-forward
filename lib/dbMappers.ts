import { Episode, EpisodeRow, Grouping, GroupingRow, FeedbackReaction } from './types';

export function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    episodeNumber: row.episode_number,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    quote: row.quote ?? '',
    audioObjectKey: row.audio_object_key,
    artworkUrl: row.artwork_url ?? undefined,
    durationSeconds: row.duration_seconds ?? 0,
    publishedAt: row.published_at ?? row.created_at,
    status: row.status,
    featured: row.featured,
  };
}

export function mapGrouping(row: GroupingRow, episodeCount = 0): Grouping {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? '',
    type: row.type,
    status: row.status ?? undefined,
    isOrdered: row.is_ordered,
    artworkUrl: row.artwork_url ?? undefined,
    episodeCount,
    featured: row.featured,
  };
}

// The DB's feedback_reaction enum uses named values, not raw emoji —
// this is the single place that translation happens (spec §6's UI is
// emoji-first, but the stored value should stay meaningful/queryable).
export const REACTION_TO_EMOJI: Record<FeedbackReaction, string> = {
  insight: '💡',
  love: '❤️',
  thinking: '🤔',
  fire: '🔥',
};

export const EMOJI_TO_REACTION: Record<string, FeedbackReaction> = {
  '💡': 'insight',
  '❤️': 'love',
  '🤔': 'thinking',
  '🔥': 'fire',
};
