import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const LOGIN_PATH = '/admin/login';
const ADMIN_PREFIX = '/admin';

function loginRedirect(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.search = '';
  loginUrl.searchParams.set('callbackUrl', pathname + search);
  return NextResponse.redirect(loginUrl);
}

/** Protect every admin page at the edge. Server layouts and APIs repeat the
 * authorization check so a stale or forged client-side navigation cannot
 * bypass the role requirement. */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return NextResponse.next();
  }
  if (!pathname.startsWith(ADMIN_PREFIX)) return NextResponse.next();

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return loginRedirect(request);

  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'admin') return loginRedirect(request);

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
