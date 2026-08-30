import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { renderMarkdown } from '@/lib/markdown';

const updatePageSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(200).optional(),
  contentMd: z.string().min(1, '内容不能为空').max(200_000).optional(),
  visible: z.boolean().optional(),
}).strict();

type RouteContext = { params: Promise<{ id: string }> };

/** PUT /api/admin/pages/[id] — 更新页面 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const existing = await db.query.singlePages.findFirst({ where: eq(schema.singlePages.id, id) });
    if (!existing) return NextResponse.json({ error: '页面不存在' }, { status: 404 });

    const parsed = updatePageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    await db.update(schema.singlePages).set({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.contentMd !== undefined ? { contentMd: parsed.data.contentMd, contentHtml: await renderMarkdown(parsed.data.contentMd) } : {}),
      ...(parsed.data.visible !== undefined ? { visible: parsed.data.visible } : {}),
      updatedAt: new Date(),
    }).where(eq(schema.singlePages.id, id));

    const page = await db.query.singlePages.findFirst({ where: eq(schema.singlePages.id, id) });
    return NextResponse.json({ page });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to update page:', error);
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

/** DELETE /api/admin/pages/[id] — 删除页面 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const existing = await db.query.singlePages.findFirst({ where: eq(schema.singlePages.id, id) });
    if (!existing) return NextResponse.json({ error: '页面不存在' }, { status: 404 });

    await db.delete(schema.singlePages).where(eq(schema.singlePages.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}
