import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const updateSkillSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(500).optional().nullable(),
  color: z.string().max(7).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  proficiency: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

// 更新技能 (仅管理员)
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
    const validatedData = updateSkillSchema.parse(body);

    const updatedSkill = await db
      .update(schema.skills)
      .set(validatedData)
      .where(eq(schema.skills.id, id))
      .returning();

    if (updatedSkill.length === 0) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSkill[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// 删除技能 (仅管理员)
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
      .delete(schema.skills)
      .where(eq(schema.skills.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
