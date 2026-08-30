import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { createBackup } from '@/lib/backup';

const createBackupSchema = z.object({
  note: z.string().trim().max(255).optional(),
}).strict();

/** GET /api/admin/backup — 备份列表 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const backups = await db.query.backups.findMany({ orderBy: [desc(schema.backups.createdAt)], limit: 100 });
    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Failed to list backups:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

/** POST /api/admin/backup — 创建整站备份（MySQL dump + 附件 tar.gz，PRD 11.11） */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = createBackupSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await createBackup(parsed.data.note);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error('Failed to create backup:', error);
    return NextResponse.json({ error: '备份创建失败，请查看服务端日志' }, { status: 500 });
  }
}
