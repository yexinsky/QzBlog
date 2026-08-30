import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { handleImageUpload, resolveStorageDriver } from '@/lib/storage';
import { withRatelimit, globalRatelimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 9;

/** 上传图片并写入附件库（PRD 11.3）。支持单文件 file 或多文件 files（≤9 个）。 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate before consuming shared rate-limit capacity. This also prevents an
    // anonymous caller from discovering rate-limit state through this privileged API.
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) return ratelimitCheck.response!;

    const declaredLength = Number(request.headers.get('content-length'));
    // 允许多文件请求的整体体积放大（单文件仍受 5MB 限制）
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES * MAX_FILES_PER_REQUEST + 64 * 1024) {
      return NextResponse.json({ error: 'Upload exceeds size limit' }, { status: 413 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      // Malformed or empty multipart body is a client error, not a server fault.
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const collected: File[] = [];
    for (const value of formData.getAll('file')) if (value instanceof File) collected.push(value);
    for (const value of formData.getAll('files')) if (value instanceof File) collected.push(value);
    if (collected.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (collected.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `一次最多上传 ${MAX_FILES_PER_REQUEST} 个文件` }, { status: 400 });
    }
    const groupId = typeof formData.get('groupId') === 'string' ? (formData.get('groupId') as string) : null;

    const attachments = [];
    const urls = [];
    for (const entry of collected) {
      if (entry.size < 1 || entry.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: `「${entry.name}」大小必须在 1 字节与 5MB 之间` }, { status: 413 });
      }
      const buffer = Buffer.from(await entry.arrayBuffer());
      const result = await handleImageUpload({ buffer, filename: entry.name, mimetype: entry.type });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const storage = resolveStorageDriver();
      const filename = result.url.split('/').pop() ?? '';
      const [record] = await db
        .insert(schema.attachments)
        .values({
          filename,
          originalName: entry.name || filename,
          mimeType: 'image/webp',
          size: buffer.length,
          url: result.url,
          groupId: groupId || null,
          storage,
          uploaderId: session.user.id ?? null,
        })
        .$returningId();
      const created = await db.query.attachments.findFirst({ where: eq(schema.attachments.id, record.id) });
      attachments.push(created);
      urls.push(result.url);
    }

    return NextResponse.json(
      { attachments, urls, url: urls[0] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
