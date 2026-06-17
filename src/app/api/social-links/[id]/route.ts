import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const updateSocialLinkSchema = z.object({
  platform: z.string().min(1).max(50).optional(),
  url: z.string().url().max(500).optional(),
  icon: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

// 更新社交链接 (仅管理员)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = updateSocialLinkSchema.parse(body);

    const updatedSocialLink = await db
      .update(schema.socialLinks)
      .set(validatedData)
      .where(eq(schema.socialLinks.id, id))
      .returning();

    if (updatedSocialLink.length === 0) {
      return NextResponse.json(
        { error: 'Social link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSocialLink[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating social link:', error);
    return NextResponse.json(
      { error: 'Failed to update social link' },
      { status: 500 }
    );
  }
}

// 删除社交链接 (仅管理员)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const deleted = await db
      .delete(schema.socialLinks)
      .where(eq(schema.socialLinks.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Social link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting social link:', error);
    return NextResponse.json(
      { error: 'Failed to delete social link' },
      { status: 500 }
    );
  }
}
