import { z } from 'zod';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, desc, sql } from 'drizzle-orm';
import { withRatelimit, momentRatelimit } from '@/lib/rate-limit';
import { generateSummary } from '@/lib/markdown';
import { siteImageUrl } from '@/lib/validation';

const MAX_IMAGES = 9;

const imageUrlSchema = siteImageUrl;

// v1.1（PRD 11.7）：动态支持 Markdown（纯文字仍限 500 字）与多图（≤9 张）。
// content 保留为纯文本摘要；contentMd 为 Markdown 原文。
const createMomentSchema = z.object({
  contentMd: z.string().trim().min(1, '动态内容不能为空').max(500, '动态内容不能超过 500 个字符').optional(),
  content: z.string().trim().min(1, '动态内容不能为空').max(500, '动态内容不能超过 500 个字符').optional(),
  images: z.array(imageUrlSchema).max(MAX_IMAGES, `最多上传 ${MAX_IMAGES} 张图片`).optional(),
  imageUrl: z.union([imageUrlSchema, z.literal('')]).optional(),
}).transform((data) => ({
  contentMd: data.contentMd ?? data.content ?? '',
  images: data.images ?? (data.imageUrl ? [data.imageUrl] : []),
}));

export async function GET(request: NextRequest) {
  try {
    const ratelimitCheck = await withRatelimit(momentRatelimit)(request);
    if (!ratelimitCheck.success) return ratelimitCheck.response!;

    const { searchParams } = new URL(request.url);
    const pagination = z.object({
      page: z.coerce.number().int().min(1).max(100_000).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).safeParse({ page: searchParams.get('page') ?? undefined, limit: searchParams.get('limit') ?? undefined });
    if (!pagination.success) return NextResponse.json({ error: 'Invalid pagination', code: 'VALIDATION_ERROR' }, { status: 400 });

    const { page, limit } = pagination.data;
    const moments = await db.query.moments.findMany({
      orderBy: [desc(schema.moments.publishedAt)],
      limit,
      offset: (page - 1) * limit,
    });
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.moments);
    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      moments: moments.map((moment) => ({ ...moment, images: moment.images ?? [], isLiked: false })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching moments:', error);
    return NextResponse.json({ error: 'Failed to fetch moments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const ratelimitCheck = await withRatelimit(momentRatelimit)(request);
    if (!ratelimitCheck.success) return ratelimitCheck.response!;

    const { contentMd, images } = createMomentSchema.parse(await request.json());
    const momentId = randomUUID();
    await db.insert(schema.moments).values({
      id: momentId,
      content: generateSummary(contentMd, 500),
      contentMd,
      images,
      publishedAt: new Date(),
    });
    const newMoment = await db.query.moments.findFirst({ where: eq(schema.moments.id, momentId) });
    return NextResponse.json(newMoment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message || 'Validation error', details: error.errors }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Error creating moment:', error);
    return NextResponse.json({ error: 'Failed to create moment' }, { status: 500 });
  }
}
