import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { withRatelimit, momentRatelimit } from '@/lib/ratelimit';

const updateMomentSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

// 更新动态
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
    const validatedData = updateMomentSchema.parse(body);

    const updatedMoment = await db
      .update(schema.moments)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(schema.moments.id, id))
      .returning();

    if (updatedMoment.length === 0) {
      return NextResponse.json(
        { error: 'Moment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedMoment[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating moment:', error);
    return NextResponse.json(
      { error: 'Failed to update moment' },
      { status: 500 }
    );
  }
}

// 删除动态
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
      .delete(schema.moments)
      .where(eq(schema.moments.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Moment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting moment:', error);
    return NextResponse.json(
      { error: 'Failed to delete moment' },
      { status: 500 }
    );
  }
}