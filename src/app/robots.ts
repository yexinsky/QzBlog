import type { MetadataRoute } from 'next'
import { getSiteSettings } from '@/lib/settings'

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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = resolveBaseUrl()

  // v1.1（PRD 11.10）：屏蔽搜索引擎开关 —— 开启后全站 Disallow（开发/临时闭站场景）
  const settings = await getSiteSettings()
  if (settings.blockSearchEngine) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/console', '/api', '/console/login'],
      },
    ],
    sitemap: baseUrl + '/sitemap.xml',
    host: baseUrl,
  }
}
