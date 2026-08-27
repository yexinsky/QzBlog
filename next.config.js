/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js currently requires inline styles; unsafe-eval is development-only for source maps/HMR.
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com http://localhost:9000",
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
    ],
    unoptimized: true,
  },
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
