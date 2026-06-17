import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, desc, sql, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 管理员获取所有评论（含待审核）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereConditions: any[] = [];
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      whereConditions.push(eq(schema.comments.status, status as any));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // 查询评论（含关联文章信息）
    const comments = await db.query.comments.findMany({
      where: whereClause,
      with: {
        post: {
          columns: { id: true, title: true, slug: true },
        },
      },
      orderBy: [desc(schema.comments.createdAt)],
      limit,
      offset,
    });

    // 获取各状态计数
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.comments)
      .where(eq(schema.comments.status, 'pending'));

    const [approvedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.comments)
      .where(eq(schema.comments.status, 'approved'));

    const [rejectedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.comments)
      .where(eq(schema.comments.status, 'rejected'));

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.comments);

    return NextResponse.json({
      comments,
      counts: {
        pending: pendingCount?.count || 0,
        approved: approvedCount?.count || 0,
        rejected: rejectedCount?.count || 0,
        total: totalCount?.count || 0,
      },
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching admin comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
