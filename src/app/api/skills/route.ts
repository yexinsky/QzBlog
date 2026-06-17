import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { desc } from 'drizzle-orm';

// Validation schemas
const createSkillSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().max(500).optional().nullable(),
  color: z.string().max(7).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  proficiency: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().optional(),
});

// 获取技能列表
export async function GET() {
  try {
    const skills = await db.query.skills.findMany({
      orderBy: [desc(schema.skills.sortOrder), desc(schema.skills.createdAt)],
    });

    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

// 创建技能 (仅管理员)
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
    const validatedData = createSkillSchema.parse(body);

    const newSkill = await db
      .insert(schema.skills)
      .values({
        name: validatedData.name,
        icon: validatedData.icon,
        color: validatedData.color,
        category: validatedData.category,
        proficiency: validatedData.proficiency || 0,
        sortOrder: validatedData.sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newSkill[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}
