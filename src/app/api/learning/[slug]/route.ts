import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { withRatelimit, globalRatelimit } from '@/lib/ratelimit';

// 获取单个学习路线（通过 slug）
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const { slug } = params;

    const route = await db.query.learningRoutes.findFirst({
      where: eq(schema.learningRoutes.slug, slug),
      with: {
        nodes: {
          orderBy: [schema.learningNodes.sortOrder],
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

    if (!route) {
      return NextResponse.json(
        { error: 'Learning route not found' },
        { status: 404 }
      );
    }

    // 计算进度
    const totalNodes = route.nodes?.length || 0;
    const completedNodes = route.nodes?.filter((n) => n.status === 'completed').length || 0;
    const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    return NextResponse.json({
      ...route,
      totalNodes,
      completedNodes,
      progress,
    });
  } catch (error) {
    console.error('Error fetching learning route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning route' },
      { status: 500 }
    );
  }
}
