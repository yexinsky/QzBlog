import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { getSiteSettings } from '@/lib/settings';

// v1.1 设置白名单：阶段二开放站点信息与评论策略；SMTP/飞书/SEO 在 11.8~11.10 启用
const updateSettingsSchema = z.object({
  siteName: z.string().trim().min(1, '站点名称不能为空').max(100).optional(),
  siteDescription: z.string().trim().max(500).optional().nullable(),
  darkModeDefault: z.boolean().optional(),
  customCss: z.string().max(100_000).optional().nullable(),
  icpNumber: z.string().trim().max(100).optional().nullable(),
  enableComments: z.boolean().optional(),
}).strict();

/** GET /api/admin/settings — 读取站点设置 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const settings = await getSiteSettings();
    return NextResponse.json({ settings });
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

    await db
      .update(schema.siteSettings)
      .set({
        ...(data.siteName !== undefined ? { siteName: data.siteName } : {}),
        ...(data.siteDescription !== undefined ? { siteDescription: data.siteDescription || null } : {}),
        ...(data.darkModeDefault !== undefined ? { darkModeDefault: data.darkModeDefault } : {}),
        ...(data.customCss !== undefined ? { customCss: data.customCss || null } : {}),
        ...(data.icpNumber !== undefined ? { icpNumber: data.icpNumber || null } : {}),
        ...(data.enableComments !== undefined ? { enableComments: data.enableComments } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.siteSettings.id, current.id));

    const settings = await db.query.siteSettings.findFirst({ where: eq(schema.siteSettings.id, current.id) });
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to update settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
