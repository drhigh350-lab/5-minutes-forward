const COOKIE_NAME = 'fmf_admin_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;

  if (!s) {
    throw new Error(
      'Missing ADMIN_SESSION_SECRET — check .env.local'
    );
  }

  return s;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret()),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return toHex(signature);
}

export async function createAdminSessionToken(): Promise<{
  value: string;
  maxAgeSeconds: number;
}> {
  const expiresAt =
    Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  const payload = String(expiresAt);
  const signature = await sign(payload);

  return {
    value: `${payload}.${signature}`,
    maxAgeSeconds: SESSION_TTL_SECONDS,
  };
}

export async function isValidAdminSessionToken(
  token: string | undefined | null
): Promise<boolean> {
  if (!token) return false;

  const [payload, signature] = token.split('.');

  if (!payload || !signature) return false;

  const expected = await sign(payload);

  if (signature.length !== expected.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < signature.length; i++) {
    result |=
      signature.charCodeAt(i) ^
      expected.charCodeAt(i);
  }

  if (result !== 0) {
    return false;
  }

  const expiresAt = Number(payload);

  return (
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now() / 1000
  );
}

export function checkAdminPassword(
  candidate: string
): boolean {
  const real = process.env.ADMIN_PASSWORD;

  if (!real) {
    throw new Error(
      'Missing ADMIN_PASSWORD — check .env.local'
    );
  }

  return candidate === real;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
