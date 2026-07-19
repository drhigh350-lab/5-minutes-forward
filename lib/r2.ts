import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 is S3-API-compatible, so the standard AWS SDK works
 * against it by pointing `endpoint` at the account's R2 endpoint.
 * SERVER-ONLY — these credentials must never reach the browser.
 */
export function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY — check .env.local against .env.example'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function r2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME — check .env.local against .env.example');
  return bucket;
}
