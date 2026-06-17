import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const updateWorkExperienceSchema = z.object({
  company: z.string().min(1).max(200).optional(),
  position: z.string().min(1).max(200).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// 更新工作经历 (仅管理员)
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
    const validatedData = updateWorkExperienceSchema.parse(body);

    const updatedWorkExperience = await db
      .update(schema.workExperience)
      .set(validatedData)
      .where(eq(schema.workExperience.id, id))
      .returning();

    if (updatedWorkExperience.length === 0) {
      return NextResponse.json(
        { error: 'Work experience not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedWorkExperience[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating work experience:', error);
    return NextResponse.json(
      { error: 'Failed to update work experience' },
      { status: 500 }
    );
  }
}

// 删除工作经历 (仅管理员)
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
      .delete(schema.workExperience)
      .where(eq(schema.workExperience.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Work experience not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting work experience:', error);
    return NextResponse.json(
      { error: 'Failed to delete work experience' },
      { status: 500 }
    );
  }
}
