import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookies';

const ADMIN_PREFIX = '/admin';
const RESIDENT_PREFIX = '/resident';
const LOGIN_PATH = '/login';

function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.has(AUTH_COOKIE_NAME);
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from && from !== '/') {
    loginUrl.searchParams.set('from', from);
  }
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isLogin = pathname === LOGIN_PATH || pathname.startsWith('/login/');
  const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(ADMIN_PREFIX + '/');
  const isResidentRoute = pathname === RESIDENT_PREFIX || pathname.startsWith(RESIDENT_PREFIX + '/');
  const isRoot = pathname === '/';

  const hasSession = hasSessionCookie(request);

  // Cookie байгаа гэж session хүчинтэй гэсэн үг биш — page.tsx / requireAuth шалгана.
  if (isRoot) {
    if (!hasSession) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (isLogin) {
    return NextResponse.next();
  }

  const isProtected = isAdminRoute || isResidentRoute;
  if (isProtected && !hasSession) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login/:path*',
    '/admin/:path*',
    '/resident/:path*',
  ],
};
