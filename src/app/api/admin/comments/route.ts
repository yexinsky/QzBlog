import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = new URL(request.url).searchParams;
    const parsed = querySchema.safeParse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
    }

    const { page, limit, status } = parsed.data;
    const where = status === 'all' ? undefined : eq(schema.comments.status, status);
    const offset = (page - 1) * limit;
    const [comments, countRows] = await Promise.all([
      db.query.comments.findMany({
        where,
        columns: {
          id: true,
          targetType: true,
          targetId: true,
          parentId: true,
          depth: true,
          authorName: true,
          authorEmail: true,
          contentMd: true,
          status: true,
          isPinned: true,
          createdAt: true,
        },
        orderBy: [desc(schema.comments.createdAt)],
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(schema.comments).where(where),
    ]);

    // v1.1：评论对象泛化（post/moment），按 target 类型批量补齐标题信息
    const postIds = [...new Set(comments.filter((c) => c.targetType === 'post').map((c) => c.targetId))];
    const momentIds = [...new Set(comments.filter((c) => c.targetType === 'moment').map((c) => c.targetId))];
    const [relatedPosts, relatedMoments] = await Promise.all([
      postIds.length
        ? db.select({ id: schema.posts.id, title: schema.posts.title, slug: schema.posts.slug }).from(schema.posts).where(inArray(schema.posts.id, postIds))
        : Promise.resolve([]),
      momentIds.length
        ? db.select({ id: schema.moments.id, content: schema.moments.content }).from(schema.moments).where(inArray(schema.moments.id, momentIds))
        : Promise.resolve([]),
    ]);
    const postById = new Map(relatedPosts.map((p) => [p.id, p]));
    const momentById = new Map(relatedMoments.map((m) => [m.id, m]));

    const items = comments.map((comment) => ({
      ...comment,
      target:
        comment.targetType === 'post'
          ? (postById.get(comment.targetId)
            ? { type: 'post' as const, id: comment.targetId, title: postById.get(comment.targetId)!.title, slug: postById.get(comment.targetId)!.slug }
            : { type: 'post' as const, id: comment.targetId, title: '文章已删除', slug: null })
          : (momentById.get(comment.targetId)
            ? { type: 'moment' as const, id: comment.targetId, title: momentById.get(comment.targetId)!.content.slice(0, 50), slug: null }
            : { type: 'moment' as const, id: comment.targetId, title: '动态已删除', slug: null }),
    }));

    const total = Number(countRows[0]?.count || 0);
    return NextResponse.json({
      comments: items,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

