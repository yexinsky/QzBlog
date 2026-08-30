import { NextRequest, NextResponse } from 'next/server';
import { readLocalFile, resolveStorageDriver, isSafeStorageKey } from '@/lib/storage';

export const runtime = 'nodejs';

const MIME_BY_EXTENSION: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  // SVG 因 XSS 风险被上传策略禁止（PRD 5.5），不提供映射，未匹配类型按二进制流返回
};

/** GET /api/files/{key} — 本地磁盘存储策略的文件读取出口（PRD 11.3） */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  if (resolveStorageDriver() !== 'local') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { key } = await params;
  const storageKey = key.map((segment) => decodeURIComponent(segment)).join('/');

  if (!isSafeStorageKey(storageKey)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const buffer = await readLocalFile(storageKey);
    const extension = storageKey.split('.').pop()?.toLowerCase() ?? '';
    const contentType = MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
