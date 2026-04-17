import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth guard middleware.
 * - Unauthenticated users trying to access dashboard routes → redirect to /login
 * - Authenticated users trying to access /login → redirect to dashboard
 *
 * Uses a lightweight cookie/localStorage check via a custom header.
 * Note: Full token validation happens server-side on API calls.
 */

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookies (set by the client after login)
  const token = request.cookies.get('accessToken')?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Authenticated user trying to access login page → Redirect to dashboard
  if (token && isPublicRoute) {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Unauthenticated user trying to access protected route → Redirect to login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
