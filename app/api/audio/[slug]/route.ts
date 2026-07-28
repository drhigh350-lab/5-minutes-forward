import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEpisodeAudioKeyBySlug } from '@/lib/data';
import { createR2Client, r2BucketName } from '@/lib/r2';


const resolveAudioKey = unstable_cache(
  async (slug: string) => getEpisodeAudioKeyBySlug(slug),
  ['audio-object-key-by-slug'],
  { revalidate: 300 }
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const audioObjectKey = await resolveAudioKey(slug);
  if (!audioObjectKey) {
    return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
  }

  const publicHostname = process.env.R2_PUBLIC_HOSTNAME;
  if (publicHostname) {
    return NextResponse.redirect(`https://${publicHostname}/${audioObjectKey}`, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }

  try {
    const client = createR2Client();
    const command = new GetObjectCommand({ Bucket: r2BucketName(), Key: audioObjectKey });
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 });
    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Audio storage not configured', detail: err instanceof Error ? err.message : String(err) },
      { status: 501 }
    );
  }
}
