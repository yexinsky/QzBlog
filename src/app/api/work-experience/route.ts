import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { desc } from 'drizzle-orm';

// Validation schemas
const createWorkExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  position: z.string().min(1).max(200),
  startDate: z.string().min(1), // ISO date string
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// 获取工作经历列表
export async function GET() {
  try {
    const workExperiences = await db.query.workExperience.findMany({
      orderBy: [desc(schema.workExperience.sortOrder), desc(schema.workExperience.startDate)],
    });

    return NextResponse.json({ workExperiences });
  } catch (error) {
    console.error('Error fetching work experiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch work experiences' },
      { status: 500 }
    );
  }
}

// 创建工作经历 (仅管理员)
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
    const validatedData = createWorkExperienceSchema.parse(body);

    const newWorkExperience = await db
      .insert(schema.workExperience)
      .values({
        company: validatedData.company,
        position: validatedData.position,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        description: validatedData.description,
        sortOrder: validatedData.sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newWorkExperience[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating work experience:', error);
    return NextResponse.json(
      { error: 'Failed to create work experience' },
      { status: 500 }
    );
  }
}
