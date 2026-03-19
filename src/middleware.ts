import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PROTECTED_ROUTES = ['/history', '/watchlist', '/settings', '/api/user'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  // 1. Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && !request.headers.get('x-forwarded-proto')?.includes('https')) {
    return NextResponse.redirect(`https://${request.headers.get('host')}${pathname}`, 301);
  }

  // 2. Auth Guard
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const sessionToken = request.cookies.get('toonplayer_session')?.value;

  if (isProtected) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(sessionToken);
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('toonplayer_session');
      return response;
    }
    
    // Pass user info in headers for API routes (Internal Only)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
