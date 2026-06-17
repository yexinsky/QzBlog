import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// Validation schemas
const updateSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional().nullable(),
  siteLogo: z.string().max(500).optional().nullable(),
  siteFavicon: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().max(500).optional().nullable(),
  tagline: z.string().max(200).optional().nullable(),
  bio: z.string().optional().nullable(),
  darkModeDefault: z.boolean().optional(),
  icpNumber: z.string().max(100).optional().nullable(),
  customCss: z.string().optional().nullable(),
});

// 获取站点设置 (公开)
export async function GET() {
  try {
    const settings = await db.query.siteSettings.findFirst();

    if (!settings) {
      // 如果没有设置记录，返回默认值
      return NextResponse.json({
        settings: {
          siteName: 'QzBlog',
          siteDescription: null,
          siteLogo: null,
          siteFavicon: null,
          avatarUrl: null,
          tagline: null,
          bio: null,
          darkModeDefault: false,
          icpNumber: null,
          customCss: null,
        },
      });
    }

    // 将数据库字段映射为 API 响应字段
    return NextResponse.json({
      settings: {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        siteLogo: settings.siteLogo,
        siteFavicon: settings.siteFavicon,
        avatarUrl: settings.avatarUrl,
        tagline: settings.tagline,
        bio: settings.bio,
        darkModeDefault: settings.darkModeDefault,
        icpNumber: settings['icp备案号'],
        customCss: settings.customCss,
      },
    });
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site settings' },
      { status: 500 }
    );
  }
}

// 更新站点设置 (仅管理员)
// 使用 upsert 策略: 如果存在设置记录则更新，否则创建
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateSettingsSchema.parse(body);

    // 将 API 字段映射为数据库字段
    const dbData: Record<string, unknown> = {};
    if (validatedData.siteName !== undefined) dbData.siteName = validatedData.siteName;
    if (validatedData.siteDescription !== undefined) dbData.siteDescription = validatedData.siteDescription;
    if (validatedData.siteLogo !== undefined) dbData.siteLogo = validatedData.siteLogo;
    if (validatedData.siteFavicon !== undefined) dbData.siteFavicon = validatedData.siteFavicon;
    if (validatedData.avatarUrl !== undefined) dbData.avatarUrl = validatedData.avatarUrl;
    if (validatedData.tagline !== undefined) dbData.tagline = validatedData.tagline;
    if (validatedData.bio !== undefined) dbData.bio = validatedData.bio;
    if (validatedData.darkModeDefault !== undefined) dbData.darkModeDefault = validatedData.darkModeDefault;
    if (validatedData.icpNumber !== undefined) dbData['icp备案号'] = validatedData.icpNumber;
    if (validatedData.customCss !== undefined) dbData.customCss = validatedData.customCss;

    dbData.updatedAt = new Date();

    // 查找现有设置记录
    const existingSettings = await db.query.siteSettings.findFirst();

    let result;

    if (existingSettings) {
      // 更新现有记录
      const updated = await db
        .update(schema.siteSettings)
        .set(dbData)
        .where(eq(schema.siteSettings.id, existingSettings.id))
        .returning();
      result = updated[0];
    } else {
      // 创建新记录 (upsert)
      const inserted = await db
        .insert(schema.siteSettings)
        .values(dbData)
        .returning();
      result = inserted[0];
    }

    // 返回时映射字段名
    return NextResponse.json({
      settings: {
        siteName: result.siteName,
        siteDescription: result.siteDescription,
        siteLogo: result.siteLogo,
        siteFavicon: result.siteFavicon,
        avatarUrl: result.avatarUrl,
        tagline: result.tagline,
        bio: result.bio,
        darkModeDefault: result.darkModeDefault,
        icpNumber: result['icp备案号'],
        customCss: result.customCss,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating site settings:', error);
    return NextResponse.json(
      { error: 'Failed to update site settings' },
      { status: 500 }
    );
  }
}
