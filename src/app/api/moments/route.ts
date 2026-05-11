import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, desc, and, sql } from 'drizzle-orm';
import { withRatelimit, momentRatelimit } from '@/lib/ratelimit';

// Validation schemas
const createMomentSchema = z.object({
  content: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
});

const updateMomentSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

// 获取动态列表
export async function GET(request: NextRequest) {
  try {
    // 检查限流
    const ratelimitCheck = await withRatelimit(momentRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;

    const moments = await db.query.moments.findMany({
      orderBy: [desc(schema.moments.publishedAt)],
      limit,
      offset,
      with: {
        likes: {
          columns: {
            id: true,
          },
        },
      },
    });

    // 格式化返回数据
    const formattedMoments = moments.map((moment) => ({
      id: moment.id,
      content: moment.content,
      imageUrl: moment.imageUrl,
      likeCount: moment.likeCount,
      publishedAt: moment.publishedAt,
      createdAt: moment.createdAt,
      isLiked: false, // 前端可以根据IP判断是否已点赞
    }));

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.moments);

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      moments: formattedMoments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching moments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moments' },
      { status: 500 }
    );
  }
}

// 创建新动态
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 只有博主可以发布动态
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 检查限流
    const ratelimitCheck = await withRatelimit(momentRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const body = await request.json();
    const validatedData = createMomentSchema.parse(body);

    const newMoment = await db
      .insert(schema.moments)
      .values({
        content: validatedData.content,
        imageUrl: validatedData.imageUrl,
        publishedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newMoment[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating moment:', error);
    return NextResponse.json(
      { error: 'Failed to create moment' },
      { status: 500 }
    );
  }
}