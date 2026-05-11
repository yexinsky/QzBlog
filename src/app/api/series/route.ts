import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, desc, and } from 'drizzle-orm';
import { withRatelimit, globalRatelimit } from '@/lib/ratelimit';
import { generateSlug } from '@/lib/markdown';

// Validation schemas
const createSeriesSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  coverImage: z.string().url().optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateSeriesSchema = createSeriesSchema.partial();

// 获取系列列表
export async function GET(request: NextRequest) {
  try {
    // 检查全局限流
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const series = await db.query.series.findMany({
      orderBy: [
        desc(schema.series.isPinned),
        desc(schema.series.sortOrder),
        desc(schema.series.createdAt),
      ],
      with: {
        posts: {
          columns: {
            postId: true,
            sortOrder: true,
          },
          with: {
            post: {
              columns: {
                id: true,
                title: true,
                slug: true,
                publishedAt: true,
              },
            },
          },
          orderBy: [desc(schema.seriesPosts.sortOrder)],
        },
      },
    });

    // 格式化返回数据
    const formattedSeries = series.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description,
      coverImage: s.coverImage,
      isPinned: s.isPinned,
      sortOrder: s.sortOrder,
      postCount: s.posts?.length || 0,
      posts: s.posts?.map((sp) => sp.post).filter(Boolean) || [],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({ series: formattedSeries });
  } catch (error) {
    console.error('Error fetching series:', error);
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    );
  }
}

// 创建系列
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
    const validatedData = createSeriesSchema.parse(body);

    // 生成slug
    let slug = generateSlug(validatedData.title);

    // 检查唯一性
    const existingSeries = await db.query.series.findFirst({
      where: eq(schema.series.slug, slug),
    });

    if (existingSeries) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const newSeries = await db
      .insert(schema.series)
      .values({
        title: validatedData.title,
        slug,
        description: validatedData.description,
        coverImage: validatedData.coverImage,
        isPinned: validatedData.isPinned || false,
        sortOrder: validatedData.sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newSeries[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating series:', error);
    return NextResponse.json(
      { error: 'Failed to create series' },
      { status: 500 }
    );
  }
}