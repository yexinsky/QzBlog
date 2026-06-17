import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const updateNodeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['planned', 'learning', 'completed']).optional(),
  postId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// 更新学习节点
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
    const validatedData = updateNodeSchema.parse(body);

    const updatedNode = await db
      .update(schema.learningNodes)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(schema.learningNodes.id, id))
      .returning();

    if (updatedNode.length === 0) {
      return NextResponse.json(
        { error: 'Learning node not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedNode[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating learning node:', error);
    return NextResponse.json(
      { error: 'Failed to update learning node' },
      { status: 500 }
    );
  }
}

// 删除学习节点
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
      .delete(schema.learningNodes)
      .where(eq(schema.learningNodes.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Learning node not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting learning node:', error);
    return NextResponse.json(
      { error: 'Failed to delete learning node' },
      { status: 500 }
    );
  }
}
