import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // 检查用户是否是管理员
    if (req.nextauth.token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // 只有管理员才能访问
        return token?.role === 'admin';
      },
    },
  }
);

// 配置需要保护的路由
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
