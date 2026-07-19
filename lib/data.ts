import { createPublicClient } from './supabase';
import { mapEpisode, mapGrouping } from './dbMappers';
import { Episode, EpisodeRow, Grouping, GroupingRow } from './types';

// Real Supabase-backed replacement for the old lib/mockData.ts. Function
// signatures are unchanged on purpose — app/page.tsx and app/[slug]/page.tsx
// don't need to change, only their import source.
//
// All reads here go through the public (anon) client and are therefore
// subject to RLS — in particular, `episode` rows only come back when
// status = 'published' (see the "public read published episodes" policy),
// so draft episodes are genuinely invisible without touching app code.

export async function getLatestEpisode(): Promise<Episode | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('episode')
    .select('*')
    .order('episode_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapEpisode(data as EpisodeRow) : null;
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('episode').select('*').eq('slug', slug).maybeSingle();

  if (error) throw error;
  return data ? mapEpisode(data as EpisodeRow) : null;
}

export async function getRecentEpisodes(limit = 3) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('episode')
    .select('episode_number, title, slug, duration_seconds')
    .order('episode_number', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    episodeNumber: row.episode_number as number,
    title: row.title as string,
    slug: row.slug as string,
    durationSeconds: (row.duration_seconds as number) ?? 0,
  }));
}

/** Episode count for a grouping — computed via a count query rather than stored, so it's always accurate. */
async function getGroupingEpisodeCount(groupingId: string): Promise<number> {
  const supabase = createPublicClient();
  const { count, error } = await supabase
    .from('episode_grouping')
    .select('episode_id', { count: 'exact', head: true })
    .eq('grouping_id', groupingId);

  if (error) throw error;
  return count ?? 0;
}

/**
 * NOTE: the schema has two ways to mark a "featured" grouping —
 * `grouping_entity.featured` (boolean) and `site_settings.featured_grouping_id`.
 * Rather than silently picking one, this treats site_settings as the
 * source of truth (it's the one purpose-built for "one featured thing
 * at a time" — spec §10.6), falling back to the boolean flag if the
 * settings row hasn't been set yet.
 */
export async function getFeaturedGrouping(): Promise<{ grouping: Grouping; memberEpisodeIds: string[] } | null> {
  const supabase = createPublicClient();

  const { data: settings } = await supabase.from('site_settings').select('featured_grouping_id').maybeSingle();

  let groupingRow: GroupingRow | null = null;
  if (settings?.featured_grouping_id) {
    const { data, error } = await supabase
      .from('grouping_entity')
      .select('*')
      .eq('id', settings.featured_grouping_id)
      .maybeSingle();
    if (error) throw error;
    groupingRow = data as GroupingRow | null;
  }
  if (!groupingRow) {
    const { data, error } = await supabase.from('grouping_entity').select('*').eq('featured', true).limit(1).maybeSingle();
    if (error) throw error;
    groupingRow = data as GroupingRow | null;
  }
  if (!groupingRow) return null;

  const [{ data: members, error: membersError }, episodeCount] = await Promise.all([
    supabase.from('episode_grouping').select('episode_id').eq('grouping_id', groupingRow.id),
    getGroupingEpisodeCount(groupingRow.id),
  ]);
  if (membersError) throw membersError;

  return {
    grouping: mapGrouping(groupingRow, episodeCount),
    memberEpisodeIds: (members ?? []).map((m) => m.episode_id as string),
  };
}

/**
 * Explore teaser (spec §8): one popular grouping, excluding whichever
 * grouping is currently pinned/featured (that one gets visibility for
 * free and shouldn't also claim the "popular" slot). Reads through the
 * `public_grouping_popularity` view, which exposes ONLY is_popular —
 * never raw play counts — per spec.
 *
 * Returns null gracefully if no grouping has been marked popular yet
 * (true today, since the stats-aggregation job hasn't run — there's
 * simply no data yet, not a bug).
 */
export async function getExploreTeaser() {
  const supabase = createPublicClient();

  const { data: popular, error: popularError } = await supabase
    .from('public_grouping_popularity')
    .select('grouping_id')
    .eq('is_popular', true);
  if (popularError) throw popularError;
  if (!popular || popular.length === 0) return null;

  const { data: settings } = await supabase.from('site_settings').select('featured_grouping_id').maybeSingle();
  let featuredId = settings?.featured_grouping_id ?? null;
  if (!featuredId) {
    const { data: featuredRow } = await supabase.from('grouping_entity').select('id').eq('featured', true).maybeSingle();
    featuredId = featuredRow?.id ?? null;
  }

  const candidateIds = popular.map((p) => p.grouping_id).filter((id) => id !== featuredId);
  if (candidateIds.length === 0) return null;

  const { data: grouping, error } = await supabase
    .from('grouping_entity')
    .select('title, slug')
    .in('id', candidateIds)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!grouping) return null;

  return { title: grouping.title as string, slug: grouping.slug as string, isPopular: true };
}

export async function getGroupingsForEpisode(episodeId: string): Promise<Grouping[]> {
  const supabase = createPublicClient();
  const { data: memberships, error } = await supabase
    .from('episode_grouping')
    .select('grouping_id')
    .eq('episode_id', episodeId);
  if (error) throw error;
  if (!memberships || memberships.length === 0) return [];

  const groupingIds = memberships.map((m) => m.grouping_id as string);
  const { data: groupingRows, error: groupingsError } = await supabase
    .from('grouping_entity')
    .select('*')
    .in('id', groupingIds);
  if (groupingsError) throw groupingsError;

  const counts = await Promise.all((groupingRows ?? []).map((g) => getGroupingEpisodeCount(g.id)));
  return (groupingRows ?? []).map((row, i) => mapGrouping(row as GroupingRow, counts[i]));
}

/**
 * Autoplay / "what's next" resolution (spec §4) — three-tier fallback,
 * now against real data:
 *   1. Sequential series → next position in that series, if it exists.
 *   2. Topical collection → next *unplayed* episode in that collection.
 *   3. Otherwise → next-newest published episode overall.
 */
export async function resolveNextEpisode(
  current: Episode,
  playedEpisodeIds: Set<string> = new Set()
): Promise<Episode | null> {
  const supabase = createPublicClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from('episode_grouping')
    .select('grouping_id, position')
    .eq('episode_id', current.id);
  if (membershipsError) throw membershipsError;

  if (memberships && memberships.length > 0) {
    const groupingIds = memberships.map((m) => m.grouping_id as string);
    const { data: groupings, error: groupingsError } = await supabase
      .from('grouping_entity')
      .select('id, is_ordered')
      .in('id', groupingIds);
    if (groupingsError) throw groupingsError;

    // Tier 1: sequential series.
    for (const m of memberships) {
      const grouping = groupings?.find((g) => g.id === m.grouping_id);
      if (grouping?.is_ordered && m.position != null) {
        const { data: nextMember } = await supabase
          .from('episode_grouping')
          .select('episode_id')
          .eq('grouping_id', m.grouping_id)
          .eq('position', (m.position as number) + 1)
          .maybeSingle();
        if (nextMember) {
          const next = await getEpisodeById(nextMember.episode_id as string);
          if (next) return next;
        }
      }
    }

    // Tier 2: topical collection, next unplayed.
    for (const m of memberships) {
      const grouping = groupings?.find((g) => g.id === m.grouping_id);
      if (grouping && !grouping.is_ordered) {
        const { data: siblings } = await supabase
          .from('episode_grouping')
          .select('episode_id')
          .eq('grouping_id', m.grouping_id)
          .neq('episode_id', current.id);
        const siblingIds = (siblings ?? []).map((s) => s.episode_id as string);
        if (siblingIds.length > 0) {
          const { data: unplayedRows } = await supabase
            .from('episode')
            .select('*')
            .in('id', siblingIds)
            .not('id', 'in', `(${[...playedEpisodeIds].join(',') || 'null'})`)
            .order('episode_number', { ascending: true })
            .limit(1);
          if (unplayedRows && unplayedRows[0]) return mapEpisode(unplayedRows[0] as EpisodeRow);
        }
      }
    }
  }

  // Tier 3: next-newest published episode overall.
  const { data: nextOverall, error: nextError } = await supabase
    .from('episode')
    .select('*')
    .gt('episode_number', current.episodeNumber)
    .order('episode_number', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextError) throw nextError;

  return nextOverall ? mapEpisode(nextOverall as EpisodeRow) : null;
}

/** Strict prev/next for the on-page nav arrows — sequential series only (spec §3). */
export async function getSequentialNeighbors(
  current: Episode
): Promise<{ prev: Episode | null; next: Episode | null }> {
  const supabase = createPublicClient();

  const { data: memberships, error } = await supabase
    .from('episode_grouping')
    .select('grouping_id, position')
    .eq('episode_id', current.id)
    .not('position', 'is', null);
  if (error) throw error;
  if (!memberships || memberships.length === 0) return { prev: null, next: null };

  const groupingIds = memberships.map((m) => m.grouping_id as string);
  const { data: orderedGroupings } = await supabase
    .from('grouping_entity')
    .select('id')
    .in('id', groupingIds)
    .eq('is_ordered', true)
    .limit(1);

  const membership = memberships.find((m) => m.grouping_id === orderedGroupings?.[0]?.id);
  if (!membership || membership.position == null) return { prev: null, next: null };

  const [{ data: prevMember }, { data: nextMember }] = await Promise.all([
    supabase
      .from('episode_grouping')
      .select('episode_id')
      .eq('grouping_id', membership.grouping_id)
      .eq('position', (membership.position as number) - 1)
      .maybeSingle(),
    supabase
      .from('episode_grouping')
      .select('episode_id')
      .eq('grouping_id', membership.grouping_id)
      .eq('position', (membership.position as number) + 1)
      .maybeSingle(),
  ]);

  const [prev, next] = await Promise.all([
    prevMember ? getEpisodeById(prevMember.episode_id as string) : Promise.resolve(null),
    nextMember ? getEpisodeById(nextMember.episode_id as string) : Promise.resolve(null),
  ]);

  return { prev, next };
}

async function getEpisodeById(id: string): Promise<Episode | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from('episode').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapEpisode(data as EpisodeRow) : null;
}

/** Full published episode list for /episodes — newest first. */
export async function getAllEpisodes() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('episode')
    .select('episode_number, title, slug, duration_seconds')
    .order('episode_number', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    episodeNumber: row.episode_number as number,
    title: row.title as string,
    slug: row.slug as string,
    durationSeconds: (row.duration_seconds as number) ?? 0,
  }));
}

/** All series + collections for /series, newest/display_order first. */
export async function getAllGroupings(): Promise<Grouping[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('grouping_entity')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as GroupingRow[];
  const counts = await Promise.all(rows.map((r) => getGroupingEpisodeCount(r.id)));
  return rows.map((row, i) => mapGrouping(row, counts[i]));
}

/**
 * Grouping detail for /series/[slug] — the grouping plus its member
 * episodes, ordered by position when the grouping is sequential
 * (is_ordered), otherwise newest-first like everywhere else.
 */
export async function getGroupingBySlug(
  slug: string
): Promise<{ grouping: Grouping; episodes: Episode[] } | null> {
  const supabase = createPublicClient();
  const { data: groupingRow, error } = await supabase
    .from('grouping_entity')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!groupingRow) return null;

  const [{ data: memberships, error: membersError }, episodeCount] = await Promise.all([
    supabase
      .from('episode_grouping')
      .select('episode_id, position')
      .eq('grouping_id', groupingRow.id),
    getGroupingEpisodeCount(groupingRow.id),
  ]);
  if (membersError) throw membersError;
  if (!memberships || memberships.length === 0) {
    return { grouping: mapGrouping(groupingRow as GroupingRow, episodeCount), episodes: [] };
  }

  const episodeIds = memberships.map((m) => m.episode_id as string);
  const { data: episodeRows, error: episodesError } = await supabase
    .from('episode')
    .select('*')
    .in('id', episodeIds);
  if (episodesError) throw episodesError;

  const positionByEpisodeId = new Map(memberships.map((m) => [m.episode_id as string, m.position as number | null]));
  const isOrdered = (groupingRow as GroupingRow).is_ordered;
  const episodes = (episodeRows ?? [])
    .map((row) => mapEpisode(row as EpisodeRow))
    .sort((a, b) => {
      if (isOrdered) {
        const pa = positionByEpisodeId.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const pb = positionByEpisodeId.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return pa - pb;
      }
      return b.episodeNumber - a.episodeNumber;
    });

  return { grouping: mapGrouping(groupingRow as GroupingRow, episodeCount), episodes };
}

/**
 * Popular episodes/groupings for /explore. Reads through the
 * `public_*_popularity` views — is_popular ONLY, never raw counts
 * (spec: raw numbers are admin/stats-only). Returns empty arrays
 * gracefully; genuinely empty until the stats job (pg_cron, every 15
 * min) has enough playback data to mark anything popular.
 */
export async function getPopularEpisodes(): Promise<Episode[]> {
  const supabase = createPublicClient();
  const { data: popular, error: popularError } = await supabase
    .from('public_episode_popularity')
    .select('episode_id')
    .eq('is_popular', true);
  if (popularError) throw popularError;
  if (!popular || popular.length === 0) return [];

  const ids = popular.map((p) => p.episode_id as string);
  const { data: rows, error } = await supabase.from('episode').select('*').in('id', ids);
  if (error) throw error;
  return (rows ?? [])
    .map((row) => mapEpisode(row as EpisodeRow))
    .sort((a, b) => b.episodeNumber - a.episodeNumber);
}

export async function getPopularGroupings(): Promise<Grouping[]> {
  const supabase = createPublicClient();
  const { data: popular, error: popularError } = await supabase
    .from('public_grouping_popularity')
    .select('grouping_id')
    .eq('is_popular', true);
  if (popularError) throw popularError;
  if (!popular || popular.length === 0) return [];

  const ids = popular.map((p) => p.grouping_id as string);
  const { data: rows, error } = await supabase.from('grouping_entity').select('*').in('id', ids);
  if (error) throw error;

  const groupingRows = (rows ?? []) as GroupingRow[];
  const counts = await Promise.all(groupingRows.map((r) => getGroupingEpisodeCount(r.id)));
  return groupingRows.map((row, i) => mapGrouping(row, counts[i]));
}

export async function getSiteSettings() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('collective_invite_url, whatsapp_channel_url')
    .single();
  if (error) throw error;
  return {
    collectiveInviteUrl: data?.collective_invite_url ?? '',
    whatsappChannelUrl: data?.whatsapp_channel_url ?? '',
  };
}
