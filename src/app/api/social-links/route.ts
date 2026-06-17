import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { desc } from 'drizzle-orm';

// Validation schemas
const createSocialLinkSchema = z.object({
  platform: z.string().min(1).max(50),
  url: z.string().url().max(500),
  icon: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

// 获取社交链接列表
export async function GET() {
  try {
    const socialLinks = await db.query.socialLinks.findMany({
      orderBy: [desc(schema.socialLinks.sortOrder), desc(schema.socialLinks.createdAt)],
    });

    return NextResponse.json({ socialLinks });
  } catch (error) {
    console.error('Error fetching social links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social links' },
      { status: 500 }
    );
  }
}

// 创建社交链接 (仅管理员)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createSocialLinkSchema.parse(body);

    const newSocialLink = await db
      .insert(schema.socialLinks)
      .values({
        platform: validatedData.platform,
        url: validatedData.url,
        icon: validatedData.icon,
        sortOrder: validatedData.sortOrder || 0,
        isVisible: validatedData.isVisible !== undefined ? validatedData.isVisible : true,
      })
      .returning();

    return NextResponse.json(newSocialLink[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating social link:', error);
    return NextResponse.json(
      { error: 'Failed to create social link' },
      { status: 500 }
    );
  }
}
