import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/admin-auth';
import { BACKUP_ROOT, restoreFromBackup } from '@/lib/backup';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** POST /api/admin/backup/restore — 上传备份包整站恢复（危险操作，前端二次确认） */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '请上传备份文件' }, { status: 400 });
    }
    if (!file.name.endsWith('.tar.gz')) {
      return NextResponse.json({ error: '仅支持 .tar.gz 备份包' }, { status: 400 });
    }

    const tempPath = path.join(BACKUP_ROOT, `upload-${randomUUID()}.tar.gz`);
    await fs.mkdir(BACKUP_ROOT, { recursive: true });
    try {
      await fs.writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
      const result = await restoreFromBackup(tempPath);
      return NextResponse.json({ success: true, ...result });
    } finally {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
    }
  } catch (error) {
    console.error('Failed to restore backup:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : '恢复失败' }, { status: 500 });
  }
}
