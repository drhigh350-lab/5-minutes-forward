import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, checkAdminPassword, createAdminSessionToken } from '@/lib/adminAuth';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: '' }));

  let valid: boolean;
  try {
    valid = typeof password === 'string' && checkAdminPassword(password);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server misconfigured' },
      { status: 500 }
    );
  }

  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const { value, maxAgeSeconds } = await  createAdminSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeSeconds,
    path: '/',
  });
  return res;
}
