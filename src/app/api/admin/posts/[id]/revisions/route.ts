import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { createPostRevision, listPostRevisions } from '@/lib/revisions';
import { countWords, renderMarkdown, generateSummary } from '@/lib/markdown';

type RouteContext = { params: Promise<{ id: string }> };

const rollbackSchema = z.object({ revisionId: z.string().uuid() }).strict();

/** GET /api/admin/posts/[id]/revisions — 版本列表；带 ?revisionId= 返回单条快照内容 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, id), columns: { id: true } });
    if (!post) return NextResponse.json({ error: '文章不存在' }, { status: 404 });

    const revisionId = new URL(request.url).searchParams.get('revisionId');
    if (revisionId) {
      const revision = await db.query.postRevisions.findFirst({
        where: and(eq(schema.postRevisions.id, revisionId), eq(schema.postRevisions.postId, id)),
        columns: { id: true, title: true, contentMd: true, wordCount: true, createdAt: true },
      });
      if (!revision) return NextResponse.json({ error: '版本不存在' }, { status: 404 });
      return NextResponse.json({ revision });
    }

    const revisions = await listPostRevisions(id);
    return NextResponse.json({ revisions });
  } catch (error) {
    console.error('Failed to list revisions:', error);
    return NextResponse.json({ error: 'Failed to list revisions' }, { status: 500 });
  }
}

/**
 * POST /api/admin/posts/[id]/revisions — 一键回滚（PRD 11.13）。
 * 回滚动作本身会生成新快照，确保可再次撤销。
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, id) });
    if (!post) return NextResponse.json({ error: '文章不存在' }, { status: 404 });

    const parsed = rollbackSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const revision = await db.query.postRevisions.findFirst({
      where: eq(schema.postRevisions.id, parsed.data.revisionId),
    });
    if (!revision || revision.postId !== id) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }

    // 回滚前先对当前内容做快照，回滚本身可撤销
    await createPostRevision(id, post.title, post.contentMd, auth.session.user.id);

    await db.update(schema.posts).set({
      title: revision.title,
      contentMd: revision.contentMd,
      contentHtml: await renderMarkdown(revision.contentMd),
      wordCount: countWords(revision.contentMd),
      summary: generateSummary(revision.contentMd),
      updatedAt: new Date(),
    }).where(eq(schema.posts.id, id));

    return NextResponse.json({ success: true, restoredFrom: revision.id });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to rollback revision:', error);
    return NextResponse.json({ error: 'Failed to rollback revision' }, { status: 500 });
  }
}
