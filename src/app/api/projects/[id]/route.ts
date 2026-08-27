import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { safeHttpUrl } from '@/lib/validation';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  techStack: z.array(z.string()).optional(),
  coverImage: safeHttpUrl.optional().nullable(),
  githubUrl: safeHttpUrl.optional().nullable(),
  demoUrl: safeHttpUrl.optional().nullable(),
  starCount: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// 更新项目
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
    const validatedData = updateProjectSchema.parse(body);

    await db
      .update(schema.projects)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, id));
    const updatedProject = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) });

    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// 删除项目
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



    const deleted = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) });
    if (!deleted) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    await db
      .delete(schema.projects)
      .where(eq(schema.projects.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
