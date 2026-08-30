import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { BACKUP_ROOT } from '@/lib/backup';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/backup/[id]/download — 下载备份包 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const record = await db.query.backups.findFirst({ where: eq(schema.backups.id, id) });
    if (!record) return NextResponse.json({ error: '备份不存在' }, { status: 404 });

    // 防目录穿越：文件名必须为纯文件名
    if (record.filename.replace(/\\/g, '/').includes('..') || path.isAbsolute(record.filename)) {
      return NextResponse.json({ error: '非法备份文件名' }, { status: 400 });
    }
    const filePath = path.join(BACKUP_ROOT, record.filename);
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: '备份文件已不存在' }, { status: 404 });

    const buffer = await fs.promises.readFile(filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${record.filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('Failed to download backup:', error);
    return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 });
  }
}
