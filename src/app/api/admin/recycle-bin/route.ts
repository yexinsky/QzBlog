import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(100).optional(),
});

/** GET /api/admin/recycle-bin — 回收站文章列表（PRD 11.4） */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }
    const { page, limit, keyword } = parsed.data;

    const whereConditions = [eq(schema.posts.status, 'recycled')];
    if (keyword) {
      whereConditions.push(or(like(schema.posts.title, `%${keyword}%`), like(schema.posts.slug, `%${keyword}%`))!);
    }
    const whereClause = and(...whereConditions);

    const offset = (page - 1) * limit;
    const [posts, countRows] = await Promise.all([
      db.query.posts.findMany({
        where: whereClause,
        columns: { id: true, title: true, slug: true, summary: true, wordCount: true, updatedAt: true, createdAt: true },
        orderBy: [desc(schema.posts.updatedAt)],
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(schema.posts).where(whereClause),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return NextResponse.json({
      posts: posts.map((post) => ({ ...post, deletedAt: post.updatedAt.toISOString() })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('Failed to list recycle bin:', error);
    return NextResponse.json({ error: 'Failed to list recycle bin' }, { status: 500 });
  }
}
