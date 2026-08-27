import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const LOGIN_PATH = '/admin/login';
const ADMIN_PREFIX = '/admin';

/**
 * 后台鉴权中间件
 *
 * - 命中 /admin/login 本身及其子路径直接放行，避免循环跳转；
 * - 其余 /admin/** 路径要求存在有效的 NextAuth JWT，否则重定向到
 *   /admin/login，并通过 callbackUrl 携带原始路径以便登录后回跳；
 * - 仅作用于 /admin/** 路由，对其它路由零影响；
 * - 复用 authOptions 中的 NEXTAUTH_SECRET，保证与 NextAuth 共享签名。
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 跳过登录页面，避免无限重定向
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return NextResponse.next();
  }

  if (!pathname.startsWith(ADMIN_PREFIX)) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // 没有配置 NEXTAUTH_SECRET 时按未授权处理，跳转到登录页便于排错
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = '';
    loginUrl.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const token = await getToken({
    req: request,
    secret,
    // 显式声明 cookie 名称，便于在不同部署环境下稳定读取
    cookieName:
      process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
  });

  if (!token) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = '';
    loginUrl.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // 仅匹配 /admin/** 路由，避免对 API、静态资源等造成不必要开销
  matcher: ['/admin/:path*'],
};
