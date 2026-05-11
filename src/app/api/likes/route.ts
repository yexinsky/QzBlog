import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { withRatelimit, commentRatelimit, globalRatelimit } from '@/lib/ratelimit';
import { getClientIP } from '@/lib/rate-limit';

// Validation schemas
const likePostSchema = z.object({
  postId: z.string().uuid(),
});

const likeMomentSchema = z.object({
  momentId: z.string().uuid(),
});

/**
 * 脱敏IP地址（保留前3段，末段置零）
 */
function sanitizeIpAddress(ip: string): string {
  // IPv4: 192.168.1.123 -> 192.168.1.0
  // IPv6: 简化处理，只取前80bits
  const parts = ip.split('.');

  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  // IPv6处理
  if (ip.includes(':')) {
    const ipv6Parts = ip.split(':');
    if (ipv6Parts.length >= 4) {
      return `${ipv6Parts[0]}:${ipv6Parts[1]}:${ipv6Parts[2]}:${ipv6Parts[3]}::`;
    }
  }

  return '0.0.0.0';
}

/**
 * 获取今天的日期（用于唯一约束）
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// 点赞文章
export async function POST(request: NextRequest) {
  try {
    // 检查限流
    const ratelimitCheck = await withRatelimit(commentRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const body = await request.json();
    const validatedData = likePostSchema.parse(body);
    const ipAddress = sanitizeIpAddress(getClientIP(request));
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

    // 检查今天是否已经点赞（使用 INSERT ... ON CONFLICT DO NOTHING 语义）
    // 先检查今天的点赞记录
    const existingLike = await db.query.postLikes.findFirst({
      where: and(
        eq(schema.postLikes.postId, validatedData.postId),
        eq(schema.postLikes.ipAddress, ipAddress)
      ),
      orderBy: (postLikes, { desc }) => [desc(postLikes.createdAt)],
    });

    if (existingLike) {
      // 检查是否在今天
      const likeDate = new Date(existingLike.createdAt).toISOString().split('T')[0];

      if (likeDate === today) {
        // 今天已经点过赞了
        return NextResponse.json(
          {
            error: 'You have already liked this post today',
            code: 'ALREADY_LIKED',
          },
          { status: 409 }
        );
      }
    }

    // 创建点赞记录
    await db.insert(schema.postLikes).values({
      postId: validatedData.postId,
      ipAddress,
    });

    // 增加文章点赞数
    await db
      .update(schema.posts)
      .set({ likeCount: post.likeCount + 1 })
      .where(eq(schema.posts.id, validatedData.postId));

    return NextResponse.json({
      success: true,
      likeCount: post.likeCount + 1,
    });
  } catch (error) {
    // 处理唯一约束冲突（race condition）
    if (error instanceof Error && error.message.includes('duplicate key')) {
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
export async function PUT(request: NextRequest) {
  try {
    // 检查限流
    const ratelimitCheck = await withRatelimit(commentRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const body = await request.json();
    const validatedData = likeMomentSchema.parse(body);
    const ipAddress = sanitizeIpAddress(getClientIP(request));
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
        eq(schema.momentLikes.ipAddress, ipAddress)
      ),
      orderBy: (momentLikes, { desc }) => [desc(momentLikes.createdAt)],
    });

    if (existingLike) {
      const likeDate = new Date(existingLike.createdAt).toISOString().split('T')[0];

      if (likeDate === today) {
        return NextResponse.json(
          {
            error: 'You have already liked this moment today',
            code: 'ALREADY_LIKED',
          },
          { status: 409 }
        );
      }
    }

    // 创建点赞记录
    await db.insert(schema.momentLikes).values({
      momentId: validatedData.momentId,
      ipAddress,
    });

    // 增加动态点赞数
    await db
      .update(schema.moments)
      .set({ likeCount: moment.likeCount + 1 })
      .where(eq(schema.moments.id, validatedData.momentId));

    return NextResponse.json({
      success: true,
      likeCount: moment.likeCount + 1,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
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