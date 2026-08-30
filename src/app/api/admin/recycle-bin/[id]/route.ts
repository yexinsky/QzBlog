import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

type RouteContext = { params: Promise<{ id: string }> };

/** PUT /api/admin/recycle-bin/[id] — 恢复为草稿（PRD 11.4） */
export async function PUT(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, id) });
    if (!post || post.status !== 'recycled') {
      return NextResponse.json({ error: '回收站中不存在该文章' }, { status: 404 });
    }

    await db.update(schema.posts).set({ status: 'draft', updatedAt: new Date() }).where(eq(schema.posts.id, id));
    return NextResponse.json({ success: true, id, status: 'draft' });
  } catch (error) {
    console.error('Failed to restore post:', error);
    return NextResponse.json({ error: 'Failed to restore post' }, { status: 500 });
  }
}

/** DELETE /api/admin/recycle-bin/[id] — 彻底删除（PRD 11.4，前端二次确认） */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, id) });
    if (!post || post.status !== 'recycled') {
      return NextResponse.json({ error: '回收站中不存在该文章' }, { status: 404 });
    }

    await db.delete(schema.posts).where(eq(schema.posts.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to permanently delete post:', error);
    return NextResponse.json({ error: 'Failed to permanently delete post' }, { status: 500 });
  }
}
