import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

export type SiteSettings = typeof schema.siteSettings.$inferSelect;

/**
 * 读取站点设置单行（PRD 9.1.19 单行设计）。首次访问时自动种子默认行，
 * 读失败时返回类型安全的兜底值，保证前台渲染永不因设置缺失而中断。
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    // 单行设计：直接取第一行即可
    const existing = await db.query.siteSettings.findFirst();
    if (existing) return existing;

    const [created] = await db.insert(schema.siteSettings).values({}).$returningId();
    const seeded = await db.query.siteSettings.findFirst({ where: eq(schema.siteSettings.id, created.id) });
    if (seeded) return seeded;
  } catch (error) {
    console.error('Failed to load site settings:', error);
  }

  return fallbackSettings();
}

function fallbackSettings(): SiteSettings {
  const now = new Date();
  return {
    id: 'fallback',
    siteName: 'QzBlog',
    siteDescription: null,
    siteLogo: null,
    siteFavicon: null,
    avatarUrl: null,
    bio: null,
    darkModeDefault: false,
    icpNumber: null,
    customCss: null,
    seoKeywords: null,
    blockSearchEngine: false,
    enableComments: true,
    smtpEnabled: false,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpPass: null,
    smtpFrom: null,
    smtpDisplayName: null,
    feishuEnabled: false,
    feishuWebhookUrl: null,
    feishuSecret: null,
    feishuEvents: null,
    smtpEvents: null,
    backupKeepCount: 5,
    createdAt: now,
    updatedAt: now,
  };
}
