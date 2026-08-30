import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { desc, eq, sql } from 'drizzle-orm';
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
          parentId: true,
          depth: true,
          authorName: true,
          authorEmail: true,
          contentMd: true,
          status: true,
          isPinned: true,
          createdAt: true,
        },
        with: {
          post: { columns: { id: true, title: true, slug: true } },
        },
        orderBy: [desc(schema.comments.createdAt)],
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(schema.comments).where(where),
    ]);

    const total = Number(countRows[0]?.count || 0);
    return NextResponse.json({
      comments,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

