import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const createGroupSchema = z.object({
  displayName: z.string().trim().min(1, '分组名称不能为空').max(100, '分组名称最多 100 个字符'),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
});

/** GET /api/admin/attachment-groups — 分组列表（含附件计数） */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const rows = await db
      .select({
        id: schema.attachmentGroups.id,
        displayName: schema.attachmentGroups.displayName,
        sortOrder: schema.attachmentGroups.sortOrder,
        createdAt: schema.attachmentGroups.createdAt,
        attachmentCount: sql<number>`(
          SELECT count(*) FROM ${schema.attachments}
          WHERE ${schema.attachments.groupId} = ${schema.attachmentGroups.id}
        )`,
      })
      .from(schema.attachmentGroups)
      .orderBy(asc(schema.attachmentGroups.sortOrder), asc(schema.attachmentGroups.createdAt));

    return NextResponse.json({
      groups: rows.map((row) => ({ ...row, attachmentCount: Number(row.attachmentCount ?? 0) })),
    });
  } catch (error) {
    console.error('Failed to list attachment groups:', error);
    return NextResponse.json({ error: 'Failed to list attachment groups' }, { status: 500 });
  }
}

/** POST /api/admin/attachment-groups — 新建分组 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = createGroupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const groupId = randomUUID();
    await db.insert(schema.attachmentGroups).values({
      id: groupId,
      displayName: parsed.data.displayName,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    const group = await db.query.attachmentGroups.findFirst({ where: eq(schema.attachmentGroups.id, groupId) });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to create attachment group:', error);
    return NextResponse.json({ error: 'Failed to create attachment group' }, { status: 500 });
  }
}
