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

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  opus: 'audio/opus',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

/**
 * Best-effort MIME type for an R2 object key, used only as a fallback
 * for episodes uploaded before audio_content_type started being
 * captured at upload time (see EpisodeForm's handleAudioUpload) — the
 * RSS feed needs a real per-episode type rather than blindly assuming
 * MP3, since most existing episodes are actually WhatsApp voice notes
 * (.opus), not MP3.
 */
export function guessAudioContentType(objectKey: string): string {
  const ext = objectKey.split('.').pop()?.toLowerCase();
  return (ext && EXTENSION_CONTENT_TYPES[ext]) || 'audio/mpeg';
}
