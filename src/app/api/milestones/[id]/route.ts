import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  eventDate: z.string().optional(),
  eventType: z.enum(['work', 'study', 'open_source', 'speech', 'other']).optional(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isPublic: z.boolean().optional(),
});

// 更新里程碑
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }


    const body = await request.json();
    const validatedData = updateMilestoneSchema.parse(body);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    if (validatedData.eventDate !== undefined) {
      updateData.eventDate = new Date(validatedData.eventDate);
    }

    if (validatedData.eventType !== undefined) {
      updateData.eventType = validatedData.eventType;
    }

    if (validatedData.icon !== undefined) {
      updateData.icon = validatedData.icon;
    }

    if (validatedData.sortOrder !== undefined) {
      updateData.sortOrder = validatedData.sortOrder;
    }

    if (validatedData.isPublic !== undefined) {
      updateData.isPublic = validatedData.isPublic;
    }

    await db
      .update(schema.milestones)
      .set(updateData)
      .where(eq(schema.milestones.id, id));
    const updatedMilestone = await db.query.milestones.findFirst({ where: eq(schema.milestones.id, id) });

    if (!updatedMilestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}

// 删除里程碑
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }



    const deleted = await db.query.milestones.findFirst({ where: eq(schema.milestones.id, id) });
    if (!deleted) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }
    await db
      .delete(schema.milestones)
      .where(eq(schema.milestones.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    );
  }
}
