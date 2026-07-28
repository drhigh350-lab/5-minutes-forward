import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createR2Client, r2BucketName } from '@/lib/r2';


export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const objectKey = `audio/${Date.now()}-${safeName}`;

    const client = createR2Client();
    const command = new PutObjectCommand({
      Bucket: r2BucketName(),
      Key: objectKey,
      ContentType: contentType || 'audio/mpeg',
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 * 10 });

    return NextResponse.json({ uploadUrl, objectKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'R2 not configured — check .env.local' },
      { status: 500 }
    );
  }
}
