import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

const APP_PREFIXES = ['/dashboard', '/requests'];
const AUTH_REDIRECT_PATHS = new Set(['/', '/login']);

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAppRoute = APP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  );
  const isAuthRedirectPath = AUTH_REDIRECT_PATHS.has(pathname);

  // Unauthenticated users trying to enter the app → /login
  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated users on / or /login → /dashboard
  if (user && isAuthRedirectPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on every path except static assets, the auth callback, and image files.
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
