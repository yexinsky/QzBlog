import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { BACKUP_ROOT } from '@/lib/backup';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/backup/[id]/download 由独立路由处理；此路由负责 DELETE */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const record = await db.query.backups.findFirst({ where: eq(schema.backups.id, id) });
    if (!record) return NextResponse.json({ error: '备份不存在' }, { status: 404 });

    if (record.filename.replace(/\\/g, '/').includes('..') || path.isAbsolute(record.filename)) {
      return NextResponse.json({ error: '非法备份文件名' }, { status: 400 });
    }
    await fs.rm(path.join(BACKUP_ROOT, record.filename), { force: true });
    await db.delete(schema.backups).where(eq(schema.backups.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete backup:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}
