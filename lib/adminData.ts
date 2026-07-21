import { createAdminClient } from './supabase';
import { EpisodeRow, GroupingRow, TopicRow, FeedbackReaction } from './types';

// SERVER-ONLY. Every function here uses the service-role client, which
// bypasses RLS entirely — that's the whole point (spec's "Approach A":
// service-role server routes + a simple admin password gate, rather than
// wiring up full Supabase Auth for a single admin). Only ever call these
// from app/api/admin/** route handlers, which sit behind middleware.ts.

export interface EpisodeInput {
  episodeNumber: number;
  title: string;
  slug: string;
  description: string;
  quote: string;
  audioObjectKey: string;
  artworkUrl?: string | null;
  durationSeconds?: number | null;
  status: 'draft' | 'published';
  featured: boolean;
  publishedAt?: string | null;
  groupingIds: { groupingId: string; position?: number | null }[];
  topicIds: string[];
}

export interface GroupingInput {
  title: string;
  slug: string;
  description: string;
  type: 'series' | 'collection';
  status?: 'ongoing' | 'completed' | null;
  isOrdered: boolean;
  artworkUrl?: string | null;
  displayOrder?: number | null;
  featured: boolean;
}

export async function getNextEpisodeNumber(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('episode')
    .select('episode_number')
    .order('episode_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.episode_number ?? 0) + 1;
}

export async function listEpisodesAdmin() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('episode')
    .select('id, episode_number, title, slug, status, featured, duration_seconds, published_at')
    .order('episode_number', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getEpisodeAdmin(id: string) {
  const supabase = createAdminClient();
  const [{ data: episode, error }, { data: memberships, error: mError }, { data: topics, error: tError }] =
    await Promise.all([
      supabase.from('episode').select('*').eq('id', id).maybeSingle(),
      supabase.from('episode_grouping').select('grouping_id, position').eq('episode_id', id),
      supabase.from('episode_topic').select('topic_id').eq('episode_id', id),
    ]);
  if (error) throw error;
  if (mError) throw mError;
  if (tError) throw tError;
  if (!episode) return null;

  return {
    episode: episode as EpisodeRow,
    groupingIds: (memberships ?? []).map((m) => ({
      groupingId: m.grouping_id as string,
      position: m.position as number | null,
    })),
    topicIds: (topics ?? []).map((t) => t.topic_id as string),
  };
}

export async function createEpisode(input: EpisodeInput): Promise<string> {
  const supabase = createAdminClient();

  const { data: episode, error } = await supabase
    .from('episode')
    .insert({
      episode_number: input.episodeNumber,
      title: input.title,
      slug: input.slug,
      description: input.description,
      quote: input.quote,
      audio_object_key: input.audioObjectKey,
      artwork_url: input.artworkUrl ?? null,
      duration_seconds: input.durationSeconds ?? null,
      status: input.status,
      featured: input.featured,
      published_at: input.publishedAt ?? (input.status === 'published' ? new Date().toISOString() : null),
    })
    .select('id')
    .single();

if (error) {
  console.error('CREATE EPISODE DATABASE ERROR:', error);
  throw error;
}

  await syncEpisodeRelations(episode.id, input.groupingIds, input.topicIds);
  return episode.id as string;
}

export async function updateEpisode(id: string, input: EpisodeInput): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('episode')
    .update({
      episode_number: input.episodeNumber,
      title: input.title,
      slug: input.slug,
      description: input.description,
      quote: input.quote,
      audio_object_key: input.audioObjectKey,
      artwork_url: input.artworkUrl ?? null,
      duration_seconds: input.durationSeconds ?? null,
      status: input.status,
      featured: input.featured,
      published_at: input.publishedAt ?? null,
    })
    .eq('id', id);
  if (error) throw error;

  await syncEpisodeRelations(id, input.groupingIds, input.topicIds);
}

/** Replace-all strategy for join rows — simplest correct approach at this scale (delete then insert, in one episode's scope only). */
async function syncEpisodeRelations(
  episodeId: string,
  groupingIds: EpisodeInput['groupingIds'],
  topicIds: string[]
) {
  const supabase = createAdminClient();

  const { error: delGroupingsError } = await supabase
    .from('episode_grouping')
    .delete()
    .eq('episode_id', episodeId);
  if (delGroupingsError) throw delGroupingsError;

  if (groupingIds.length > 0) {
    const { error: insGroupingsError } = await supabase.from('episode_grouping').insert(
      groupingIds.map((g) => ({
        episode_id: episodeId,
        grouping_id: g.groupingId,
        position: g.position ?? null,
      }))
    );
    if (insGroupingsError) throw insGroupingsError;
  }

  const { error: delTopicsError } = await supabase.from('episode_topic').delete().eq('episode_id', episodeId);
  if (delTopicsError) throw delTopicsError;

  if (topicIds.length > 0) {
    const { error: insTopicsError } = await supabase
      .from('episode_topic')
      .insert(topicIds.map((topicId) => ({ episode_id: episodeId, topic_id: topicId })));
    if (insTopicsError) throw insTopicsError;
  }
}

export async function listGroupingsAdmin() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('grouping_entity')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as GroupingRow[];
}

export async function createGrouping(input: GroupingInput): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('grouping_entity')
    .insert({
      title: input.title,
      slug: input.slug,
      description: input.description,
      type: input.type,
      status: input.status ?? null,
      is_ordered: input.isOrdered,
      artwork_url: input.artworkUrl ?? null,
      display_order: input.displayOrder ?? null,
      featured: input.featured,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateGrouping(id: string, input: GroupingInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('grouping_entity')
    .update({
      title: input.title,
      slug: input.slug,
      description: input.description,
      type: input.type,
      status: input.status ?? null,
      is_ordered: input.isOrdered,
      artwork_url: input.artworkUrl ?? null,
      display_order: input.displayOrder ?? null,
      featured: input.featured,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function listTopics() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('topic').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as TopicRow[];
}

export async function createTopic(name: string, slug: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('topic').insert({ name, slug }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function getSiteSettingsAdmin() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('site_settings').select('*').single();
  if (error) throw error;
  return data;
}

export async function updateSiteSettingsAdmin(input: {
  collectiveInviteUrl?: string | null;
  whatsappChannelUrl?: string | null;
  featuredGroupingId?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('site_settings')
    .update({
      collective_invite_url: input.collectiveInviteUrl,
      whatsapp_channel_url: input.whatsappChannelUrl,
      featured_grouping_id: input.featuredGroupingId,
    })
    .eq('id', true);
  if (error) throw error;
}

/** Admin-side feedback inbox read (spec §10.4) — bypasses RLS since episode_stats-adjacent tables are locked down publicly. */
export async function listFeedbackAdmin(episodeId?: string) {
  const supabase = createAdminClient();
  let query = supabase
    .from('feedback')
    .select('id, episode_id, reaction, message, name, anonymous, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (episodeId) query = query.eq('episode_id', episodeId);
  const { data, error } = await query;
  if (error) throw error;
  return data as { id: string; episode_id: string | null; reaction: FeedbackReaction | null; message: string | null; name: string | null; anonymous: boolean; created_at: string }[];
}

/** Admin-side raw stats read (spec §10.5) — the ONLY place these numbers are ever exposed; never via a public route. */
export async function getStatsOverviewAdmin() {
  const supabase = createAdminClient();

  const [{ data: episodeStats, error: eError }, { data: groupingStats, error: gError }] =
    await Promise.all([
      supabase
        .from('episode_stats')
        .select(`
          episode_id,
          play_count,
          completion_count,
          completion_rate,
          avg_listen_seconds,
          share_count,
          is_popular,
          episode:episode_id (
            episode_number,
            title,
            slug
          )
        `)
        .order('play_count', { ascending: false })
        .limit(50),

      supabase
        .from('grouping_stats')
        .select(`
          grouping_id,
          play_count,
          completion_count,
          completion_rate,
          avg_listen_seconds,
          share_count,
          is_popular,
          grouping:grouping_id (
            title,
            slug
          )
        `)
        .order('play_count', { ascending: false })
        .limit(50),
    ]);

  if (eError) throw eError;
  if (gError) throw gError;

  return {
    episodeStats: episodeStats ?? [],
    groupingStats: groupingStats ?? [],
  };
}
