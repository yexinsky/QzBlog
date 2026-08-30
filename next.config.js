/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

// Image hosts must stay in sync with the S3/MinIO public URL configured in .env
// (S3_PUBLIC_URL / MINIO_PUBLIC_URL). Both the bare host and the loopback alias are
// allowed so uploads stay renderable whether the bucket is addressed locally or via LAN.
const storageImageHosts = ['http://192.168.5.2:9000', 'http://localhost:9000'];

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js currently requires inline styles; unsafe-eval is development-only for source maps/HMR.
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://avatars.githubusercontent.com ${storageImageHosts.join(' ')}`,
  "font-src 'self' data:",
  "connect-src 'self'" + (isProduction ? '' : ' ws: wss:'),
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ...(isProduction
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: '192.168.5.2', port: '9000' },
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  async redirects() {
    return [
      // v1.1 后台路由迁移（PRD 11.1）：旧 /admin/** 地址 301 永久重定向至 /console/**
      { source: '/admin', destination: '/console', permanent: true },
      { source: '/admin/:path*', destination: '/console/:path*', permanent: true },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
