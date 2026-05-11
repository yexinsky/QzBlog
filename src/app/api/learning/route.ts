import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { withRatelimit, globalRatelimit } from '@/lib/ratelimit';
import { generateSlug } from '@/lib/markdown';

// Validation schemas
const createLearningPathSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  coverImage: z.string().url().optional(),
});

const updateLearningPathSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
});

// 获取学习路线列表
export async function GET(request: NextRequest) {
  try {
    // 检查全局限流
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const learningPaths = await db.query.learningPaths.findMany({
      orderBy: [desc(schema.learningPaths.createdAt)],
      with: {
        nodes: {
          orderBy: [desc(schema.learningNodes.sortOrder)],
          with: {
            post: {
              columns: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // 计算进度
    const pathsWithProgress = learningPaths.map((path) => {
      const totalNodes = path.nodes?.length || 0;
      const completedNodes = path.nodes?.filter((n) => n.status === 'completed').length || 0;
      const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

      return {
        ...path,
        totalNodes,
        completedNodes,
        progress,
      };
    });

    return NextResponse.json({ learningPaths: pathsWithProgress });
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning paths' },
      { status: 500 }
    );
  }
}

// 创建学习路线
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
    const validatedData = createLearningPathSchema.parse(body);

    // 生成slug
    let slug = generateSlug(validatedData.title);

    // 检查唯一性
    const existingPath = await db.query.learningPaths.findFirst({
      where: eq(schema.learningPaths.slug, slug),
    });

    if (existingPath) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const newPath = await db
      .insert(schema.learningPaths)
      .values({
        title: validatedData.title,
        slug,
        description: validatedData.description,
        coverImage: validatedData.coverImage,
      })
      .returning();

    return NextResponse.json(newPath[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating learning path:', error);
    return NextResponse.json(
      { error: 'Failed to create learning path' },
      { status: 500 }
    );
  }
}