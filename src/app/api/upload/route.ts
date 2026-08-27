import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { handleImageUpload } from '@/lib/storage';
import { withRatelimit, globalRatelimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) return ratelimitCheck.response!;

    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const declaredLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      return NextResponse.json({ error: 'Upload exceeds 5MB limit' }, { status: 413 });
    }

    const formData = await request.formData();
    const entry = formData.get('file');
    if (!(entry instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (entry.size < 1 || entry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Image must be between 1 byte and 5MB' }, { status: 413 });
    }

    const buffer = Buffer.from(await entry.arrayBuffer());
    const result = await handleImageUpload({ buffer });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { url: result.url },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

