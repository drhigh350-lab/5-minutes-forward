// Mirrors the data model in the product spec (§7). These will map 1:1 onto
// DB rows once the real schema/ORM layer is wired up (Phase 6b).

export type GroupingType = 'series' | 'collection';
export type GroupingStatus = 'ongoing' | 'completed';

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  slug: string; // e.g. "ep82" — drives the /ep82 route
  description: string;
  quote: string;
  audioObjectKey: string; // R2 key, never exposed to the client directly
  artworkUrl?: string;
  durationSeconds: number;
  publishedAt: string; // ISO date
  status: 'draft' | 'published';
  featured: boolean;
}

export interface Grouping {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: GroupingType;
  status?: GroupingStatus; // series-relevant
  isOrdered: boolean;
  artworkUrl?: string;
  episodeCount: number;
  featured: boolean;
}

export interface EpisodeStatsPublic {
  episodeId: string;
  isPopular: boolean; // the ONLY stats field ever exposed publicly
}

export interface GroupingProgress {
  groupingId: string;
  completed: number;
  total: number;
}

export interface LastPlayed {
  episodeId: string;
  slug: string;
  title: string;
  episodeNumber: number;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------
// Raw DB row shapes — verified by direct inspection of the live
// `5-Minutes-Forward` Supabase project (ref: nourqoxqgxaulfstdgwn) on
// 2026-07-19. These are intentionally snake_case, matching the actual
// columns; lib/dbMappers.ts converts them into the camelCase app types
// above so components never need to know the DB's naming convention.
// ---------------------------------------------------------------------

export type FeedbackReaction = 'insight' | 'love' | 'thinking' | 'fire';

export interface EpisodeRow {
  id: string;
  episode_number: number;
  title: string;
  slug: string;
  description: string | null;
  quote: string | null;
  audio_object_key: string;
  artwork_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  status: 'draft' | 'published';
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupingRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: GroupingType;
  status: GroupingStatus | null;
  is_ordered: boolean;
  artwork_url: string | null;
  display_order: number | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface EpisodeGroupingRow {
  episode_id: string;
  grouping_id: string;
  position: number | null;
}

export interface TopicRow {
  id: string;
  name: string;
  slug: string;
}

export interface SiteSettingsRow {
  id: true;
  collective_invite_url: string | null;
  whatsapp_channel_url: string | null;
  featured_grouping_id: string | null;
  social_links: Record<string, string>;
  misc_site_copy: Record<string, string>;
  updated_at: string;
}
