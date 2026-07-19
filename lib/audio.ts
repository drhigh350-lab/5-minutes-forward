/**
 * Per spec §9: the client only ever knows an episode's *slug*. The actual
 * R2 object key lives server-side and is resolved by /api/audio/[slug].
 * If the storage provider ever changes, only that route changes — every
 * link ever shared on WhatsApp (which points at /epNN, not at audio
 * directly) keeps working untouched.
 */
export function audioStreamUrl(slug: string): string {
  return `/api/audio/${slug}`;
}
