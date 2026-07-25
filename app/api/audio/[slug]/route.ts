import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEpisodeAudioKeyBySlug } from '@/lib/data';
import { createR2Client, r2BucketName } from '@/lib/r2';

export const runtime = 'edge';

/**
 * Resolves /api/audio/[slug] → the episode's audio, without ever
 * exposing the R2 object key, bucket name, or credentials to the client
 * (spec §9). The client only ever knows the slug.
 *
 * Approach: 302 redirect to a short-lived presigned R2 URL. This keeps
 * range-request/seek support "for free" — the browser's <audio> element
 * follows the redirect and issues Range requests directly against R2,
 * which supports them natively. (Alternative: proxy-stream through this
 * route instead of redirecting, forwarding the Range header manually —
 * more control over caching/analytics, more code. Redirect is the
 * simpler correct choice for MVP.)
 *
 * If R2_PUBLIC_HOSTNAME is set (a CDN/custom domain in front of the
 * bucket), that's used instead of a presigned URL, since a public
 * hostname doesn't need signing and caches better at the edge.
 *
 * PERFORMANCE: this used to re-run a full `select *` episode lookup on
 * every single tap-to-play — a DB round trip sitting directly in the
 * critical path between "user taps Play" and "audio starts", even
 * though the episode page had *just* fetched the same row server-side
 * seconds earlier. audioObjectKey practically never changes after an
 * episode is published, so it's safe to memoize for a few minutes via
 * unstable_cache, keyed by slug — the query only selects the one column
 * this route actually needs, not the full row.
 */
const resolveAudioKey = unstable_cache(
  async (slug: string) => getEpisodeAudioKeyBySlug(slug),
  ['audio-object-key-by-slug'],
  { revalidate: 300 } // audioObjectKey is effectively static once published; 5 min is plenty
);

// Next.js 15: route handler params are a Promise and must be awaited.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const audioObjectKey = await resolveAudioKey(slug);
  if (!audioObjectKey) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
  }

  const publicHostname = process.env.R2_PUBLIC_HOSTNAME;
  if (publicHostname) {
    // This URL is stable (no signature/expiry), so the redirect itself
    // is safe to cache briefly at the browser/CDN — repeat plays, a
    // pause/resume, or navigating back to the episode within the same
    // few minutes skip this edge function (and the DB lookup above)
    // entirely instead of re-resolving every time.
    return NextResponse.redirect(`https://${publicHostname}/${audioObjectKey}`, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }

  try {
    const client = createR2Client();
    const command = new GetObjectCommand({ Bucket: r2BucketName(), Key: audioObjectKey });
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 }); // 10 minutes
    // Not cached: this URL is signed and expires — caching the redirect
    // risks handing back an expired link.
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    // Most likely: R2 env vars not yet configured (see .env.example).
    return NextResponse.json(
      { error: 'Audio storage not configured', detail: err instanceof Error ? err.message : String(err) },
      { status: 501 }
    );
  }
}
