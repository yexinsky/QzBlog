import { z } from 'zod';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { withRatelimit, likeRatelimit, createAnonymousClientId } from '@/lib/rate-limit';

// Validation schemas
const likePostSchema = z.object({
  postId: z.string().uuid(),
});

const likeMomentSchema = z.object({
  momentId: z.string().uuid(),
});

/**
 * 获取今天的日期（用于唯一约束）
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function isDuplicateEntryError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const mysqlError = error as { code?: string; errno?: number };
  return mysqlError.code === 'ER_DUP_ENTRY' || mysqlError.errno === 1062;
}

/**
 * 将 Zod 校验错误折叠为统一的 400 响应格式。
 */
function zodErrorResponse(error: z.ZodError): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: error.errors,
    },
    { status: 400 }
  );
}

// 点赞：POST 按请求体自动分发（momentId → 动态，否则 → 文章）；
// PUT 保留为动态点赞的兼容入口（v1.0 遗留约定）。
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (body && typeof body === 'object' && 'momentId' in body) {
    return likeMoment(request, body as { momentId: string });
  }
  return likePost(request, body as { postId: string });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return likeMoment(request, body as { momentId: string });
}

async function likePost(request: NextRequest, rawBody: { postId: string }) {
  try {
    // 检查限流
    const ratelimitCheck = await withRatelimit(likeRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const validatedData = likePostSchema.parse(rawBody);
    const ipAddress = createAnonymousClientId(request);
    const today = getToday();

    // 检查文章是否存在且已发布
    const post = await db.query.posts.findFirst({
      where: and(
        eq(schema.posts.id, validatedData.postId),
        eq(schema.posts.status, 'published')
      ),
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 先检查今天的点赞记录；数据库唯一索引负责兜底并发请求。
    const existingLike = await db.query.postLikes.findFirst({
      where: and(
        eq(schema.postLikes.postId, validatedData.postId),
        eq(schema.postLikes.ipAddress, ipAddress),
        eq(schema.postLikes.likeDate, today)
      ),
    });

    if (existingLike) {
      return NextResponse.json(
        {
          error: 'You have already liked this post today',
          code: 'ALREADY_LIKED',
        },
        { status: 409 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.insert(schema.postLikes).values({
        id: randomUUID(),
        postId: validatedData.postId,
        ipAddress,
        likeDate: today,
      });

      await tx
        .update(schema.posts)
        .set({ likeCount: sql`${schema.posts.likeCount} + 1` })
        .where(eq(schema.posts.id, validatedData.postId));
    });

    const updatedPost = await db.query.posts.findFirst({
      where: eq(schema.posts.id, validatedData.postId),
      columns: { likeCount: true },
    });

    return NextResponse.json({
      success: true,
      likeCount: updatedPost?.likeCount ?? post.likeCount + 1,
    });
  } catch (error) {
    // Zod 校验失败 → 400（请求格式问题）
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error);
    }

    // 处理唯一约束冲突（race condition）
    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        {
          error: 'You have already liked this post today',
          code: 'ALREADY_LIKED',
        },
        { status: 409 }
      );
    }

    console.error('Error liking post:', error);
    return NextResponse.json(
      { error: 'Failed to like post' },
      { status: 500 }
    );
  }
}

// 点赞动态
async function likeMoment(request: NextRequest, rawBody: { momentId: string }) {
  try {
    // 检查限流
    const ratelimitCheck = await withRatelimit(likeRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const validatedData = likeMomentSchema.parse(rawBody);
    const ipAddress = createAnonymousClientId(request);
    const today = getToday();

    // 检查动态是否存在
    const moment = await db.query.moments.findFirst({
      where: eq(schema.moments.id, validatedData.momentId),
    });

    if (!moment) {
      return NextResponse.json(
        { error: 'Moment not found' },
        { status: 404 }
      );
    }

    // 检查今天是否已经点赞
    const existingLike = await db.query.momentLikes.findFirst({
      where: and(
        eq(schema.momentLikes.momentId, validatedData.momentId),
        eq(schema.momentLikes.ipAddress, ipAddress),
        eq(schema.momentLikes.likeDate, today)
      ),
    });

    if (existingLike) {
      return NextResponse.json(
        {
          error: 'You have already liked this moment today',
          code: 'ALREADY_LIKED',
        },
        { status: 409 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.insert(schema.momentLikes).values({
        id: randomUUID(),
        momentId: validatedData.momentId,
        ipAddress,
        likeDate: today,
      });

      await tx
        .update(schema.moments)
        .set({ likeCount: sql`${schema.moments.likeCount} + 1` })
        .where(eq(schema.moments.id, validatedData.momentId));
    });

    const updatedMoment = await db.query.moments.findFirst({
      where: eq(schema.moments.id, validatedData.momentId),
      columns: { likeCount: true },
    });

    return NextResponse.json({
      success: true,
      likeCount: updatedMoment?.likeCount ?? moment.likeCount + 1,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error);
    }

    if (isDuplicateEntryError(error)) {
      return NextResponse.json(
        {
          error: 'You have already liked this moment today',
          code: 'ALREADY_LIKED',
        },
        { status: 409 }
      );
    }

    console.error('Error liking moment:', error);
    return NextResponse.json(
      { error: 'Failed to like moment' },
      { status: 500 }
    );
  }
}

