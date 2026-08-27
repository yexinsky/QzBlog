import type { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

// 与 sitemap.ts / rss.xml/route.ts 保持一致的 base URL 解析策略。
// 优先级：SITE_URL > NEXTAUTH_URL > http://localhost:3000。
// 这是内联复制，避免在 .env.example 未声明 SITE_URL 之前跨文件依赖。
function resolveBaseUrl(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveBaseUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/admin/login'],
      },
    ],
    sitemap: baseUrl + '/sitemap.xml',
    host: baseUrl,
  }
}
