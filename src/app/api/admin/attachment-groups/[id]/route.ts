import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const updateGroupSchema = z.object({
  displayName: z.string().trim().min(1, '分组名称不能为空').max(100, '分组名称最多 100 个字符').optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** PUT /api/admin/attachment-groups/[id] — 重命名/排序分组 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const existing = await db.query.attachmentGroups.findFirst({ where: eq(schema.attachmentGroups.id, id) });
    if (!existing) return NextResponse.json({ error: '分组不存在' }, { status: 404 });

    const parsed = updateGroupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    await db
      .update(schema.attachmentGroups)
      .set({
        ...(parsed.data.displayName !== undefined ? { displayName: parsed.data.displayName } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      })
      .where(eq(schema.attachmentGroups.id, id));

    const group = await db.query.attachmentGroups.findFirst({ where: eq(schema.attachmentGroups.id, id) });
    return NextResponse.json({ group });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to update attachment group:', error);
    return NextResponse.json({ error: 'Failed to update attachment group' }, { status: 500 });
  }
}

/** DELETE /api/admin/attachment-groups/[id] — 删除分组，组内附件归入「未分组」 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const existing = await db.query.attachmentGroups.findFirst({ where: eq(schema.attachmentGroups.id, id) });
    if (!existing) return NextResponse.json({ error: '分组不存在' }, { status: 404 });

    // attachments.group_id 外键为 ON DELETE SET NULL：附件自动归入未分组
    await db.delete(schema.attachmentGroups).where(eq(schema.attachmentGroups.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete attachment group:', error);
    return NextResponse.json({ error: 'Failed to delete attachment group' }, { status: 500 });
  }
}
