import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { getSiteSettings } from '@/lib/settings';
import { encryptSecret } from '@/lib/crypto';

const urlLike = z.string().trim().max(500);

// v1.1（PRD 11.5/11.8/11.9/11.10）：设置项全量白名单。
// smtp_pass / feishu_secret 加密存储、界面不明文回显。
const updateSettingsSchema = z.object({
  siteName: z.string().trim().min(1, '站点名称不能为空').max(100).optional(),
  siteDescription: z.string().trim().max(500).optional().nullable(),
  darkModeDefault: z.boolean().optional(),
  customCss: z.string().max(100_000).optional().nullable(),
  icpNumber: z.string().trim().max(100).optional().nullable(),
  enableComments: z.boolean().optional(),
  // SEO（PRD 11.10）
  seoKeywords: z.string().trim().max(500).optional().nullable(),
  blockSearchEngine: z.boolean().optional(),
  // SMTP（PRD 11.8）
  smtpEnabled: z.boolean().optional(),
  smtpHost: z.string().trim().max(200).optional().nullable(),
  smtpPort: z.number().int().min(1).max(65_535).optional().nullable(),
  smtpUser: z.string().trim().max(200).optional().nullable(),
  smtpPass: z.string().max(500).optional().nullable(),
  smtpFrom: urlLike.optional().nullable(),
  smtpDisplayName: z.string().trim().max(100).optional().nullable(),
  // 飞书（PRD 11.9）
  feishuEnabled: z.boolean().optional(),
  feishuWebhookUrl: urlLike.optional().nullable(),
  feishuSecret: z.string().max(500).optional().nullable(),
  feishuEvents: z.array(z.enum(['comment.pending', 'post.published', 'backup.completed', 'backup.failed'])).optional(),
}).strict();

/** GET /api/admin/settings — 读取站点设置（敏感字段掩码） */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const settings = await getSiteSettings();
    return NextResponse.json({
      settings: {
        ...settings,
        smtpPass: undefined,
        feishuSecret: undefined,
        smtpPassSet: Boolean(settings.smtpPass),
        feishuSecretSet: Boolean(settings.feishuSecret),
      },
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

/** PUT /api/admin/settings — 更新站点设置 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = updateSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const current = await getSiteSettings();
    const data = parsed.data;
    const nullableString = (value?: string | null) => (value === undefined ? undefined : value || null);

    // 密钥字段：前端传空字符串表示清除，传 null 表示不修改
    let smtpPassUpdate: string | null | undefined;
    if (data.smtpPass !== undefined) {
      smtpPassUpdate = data.smtpPass === '' ? null : data.smtpPass === null ? undefined : encryptSecret(data.smtpPass);
    }
    let feishuSecretUpdate: string | null | undefined;
    if (data.feishuSecret !== undefined) {
      feishuSecretUpdate = data.feishuSecret === '' ? null : data.feishuSecret === null ? undefined : encryptSecret(data.feishuSecret);
    }

    const updates = {
      ...(data.siteName !== undefined ? { siteName: data.siteName } : {}),
      ...(data.siteDescription !== undefined ? { siteDescription: nullableString(data.siteDescription) } : {}),
      ...(data.darkModeDefault !== undefined ? { darkModeDefault: data.darkModeDefault } : {}),
      ...(data.customCss !== undefined ? { customCss: nullableString(data.customCss) } : {}),
      ...(data.icpNumber !== undefined ? { icpNumber: nullableString(data.icpNumber) } : {}),
      ...(data.enableComments !== undefined ? { enableComments: data.enableComments } : {}),
      ...(data.seoKeywords !== undefined ? { seoKeywords: nullableString(data.seoKeywords) } : {}),
      ...(data.blockSearchEngine !== undefined ? { blockSearchEngine: data.blockSearchEngine } : {}),
      ...(data.smtpEnabled !== undefined ? { smtpEnabled: data.smtpEnabled } : {}),
      ...(data.smtpHost !== undefined ? { smtpHost: nullableString(data.smtpHost) } : {}),
      ...(data.smtpPort !== undefined ? { smtpPort: data.smtpPort } : {}),
      ...(data.smtpUser !== undefined ? { smtpUser: nullableString(data.smtpUser) } : {}),
      ...(smtpPassUpdate !== undefined ? { smtpPass: smtpPassUpdate } : {}),
      ...(data.smtpFrom !== undefined ? { smtpFrom: nullableString(data.smtpFrom) } : {}),
      ...(data.smtpDisplayName !== undefined ? { smtpDisplayName: nullableString(data.smtpDisplayName) } : {}),
      ...(data.feishuEnabled !== undefined ? { feishuEnabled: data.feishuEnabled } : {}),
      ...(data.feishuWebhookUrl !== undefined ? { feishuWebhookUrl: nullableString(data.feishuWebhookUrl) } : {}),
      ...(feishuSecretUpdate !== undefined ? { feishuSecret: feishuSecretUpdate } : {}),
      ...(data.feishuEvents !== undefined ? { feishuEvents: data.feishuEvents } : {}),
      updatedAt: new Date(),
    };

    if (Object.keys(updates).length > 1) {
      await db.update(schema.siteSettings).set(updates).where(eq(schema.siteSettings.id, current.id));
    }

    const settings = await db.query.siteSettings.findFirst({ where: eq(schema.siteSettings.id, current.id) });
    return NextResponse.json({
      settings: settings ? { ...settings, smtpPass: undefined, feishuSecret: undefined, smtpPassSet: Boolean(settings.smtpPass), feishuSecretSet: Boolean(settings.feishuSecret) } : settings,
    });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
