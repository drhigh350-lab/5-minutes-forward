import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEpisodeBySlug } from '@/lib/data';
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
 */
// Next.js 15: route handler params are a Promise and must be awaited.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
  }

  const publicHostname = process.env.R2_PUBLIC_HOSTNAME;
  if (publicHostname) {
    return NextResponse.redirect(`https://${publicHostname}/${episode.audioObjectKey}`, {
      status: 302,
    });
  }

  try {
    const client = createR2Client();
    const command = new GetObjectCommand({ Bucket: r2BucketName(), Key: episode.audioObjectKey });
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 }); // 10 minutes
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    // Most likely: R2 env vars not yet configured (see .env.example).
    return NextResponse.json(
      { error: 'Audio storage not configured', detail: err instanceof Error ? err.message : String(err) },
      { status: 501 }
    );
  }
}
