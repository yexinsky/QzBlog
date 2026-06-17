import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const createNodeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  status: z.enum(['planned', 'learning', 'completed']).optional(),
  postId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// 添加学习节点（通过 slug 识别路线）
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 通过 slug 查找路线
    const learningRoute = await db.query.learningRoutes.findFirst({
      where: eq(schema.learningRoutes.slug, params.slug),
    });

    if (!learningRoute) {
      return NextResponse.json({ error: 'Learning route not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createNodeSchema.parse(body);

    // 验证父节点
    if (validatedData.parentId) {
      const parentNode = await db.query.learningNodes.findFirst({
        where: eq(schema.learningNodes.id, validatedData.parentId),
      });
      if (!parentNode || parentNode.routeId !== learningRoute.id) {
        return NextResponse.json({ error: 'Invalid parent node' }, { status: 400 });
      }
    }

    const newNode = await db
      .insert(schema.learningNodes)
      .values({
        routeId: learningRoute.id,
        title: validatedData.title,
        description: validatedData.description,
        status: validatedData.status,
        postId: validatedData.postId,
        parentId: validatedData.parentId,
        sortOrder: validatedData.sortOrder,
      })
      .returning();

    return NextResponse.json(newNode[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error creating learning node:', error);
    return NextResponse.json({ error: 'Failed to create learning node' }, { status: 500 });
  }
}
