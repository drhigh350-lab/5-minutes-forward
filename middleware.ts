import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, isValidAdminSessionToken } from '@/lib/adminAuth';

// Gates every /admin page and /api/admin/* route behind the signed
// session cookie set by /api/admin/login. The login route/page itself
// must stay reachable without a session — everything else in the
// matcher below requires one.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  let authed: boolean;
  try {
    authed = await isValidAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
  } catch {
    // ADMIN_SESSION_SECRET missing/misconfigured — fail closed rather
    // than letting the request through.
    return pathname.startsWith('/api/admin')
      ? NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
      : new NextResponse('Server misconfigured', { status: 500 });
  }

  if (authed) return NextResponse.next();

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
