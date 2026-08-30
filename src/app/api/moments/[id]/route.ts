import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { generateSummary } from '@/lib/markdown';
import { requireAdmin } from '@/lib/admin-auth';

const MAX_IMAGES = 9;
const imageUrlSchema = z.string().trim().url('图片地址格式不正确').max(500);

// v1.1（PRD 11.7）：更新支持 Markdown 原文与多图；content 同步刷新为纯文本摘要
const updateMomentSchema = z.object({
  contentMd: z.string().trim().min(1, '动态内容不能为空').max(500, '动态内容不能超过 500 个字符').optional(),
  images: z.array(imageUrlSchema).max(MAX_IMAGES, `最多上传 ${MAX_IMAGES} 张图片`).optional().nullable(),
}).strict().refine((data) => Object.keys(data).length > 0, { message: '至少需要更新一个字段' });

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const existing = await db.query.moments.findFirst({ where: eq(schema.moments.id, id) });
    if (!existing) return NextResponse.json({ error: 'Moment not found' }, { status: 404 });

    const validatedData = updateMomentSchema.parse(await request.json());
    const nextContentMd = validatedData.contentMd ?? existing.contentMd ?? existing.content;
    await db.update(schema.moments).set({
      contentMd: nextContentMd,
      content: generateSummary(nextContentMd, 500),
      ...(validatedData.images !== undefined ? { images: validatedData.images ?? [] } : {}),
      updatedAt: new Date(),
    }).where(eq(schema.moments.id, id));
    const updatedMoment = await db.query.moments.findFirst({ where: eq(schema.moments.id, id) });
    return NextResponse.json(updatedMoment);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0]?.message || 'Validation error', details: error.errors }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Error updating moment:', error);
    return NextResponse.json({ error: 'Failed to update moment' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;
    const { id } = await params;
    const existing = await db.query.moments.findFirst({ where: eq(schema.moments.id, id) });
    if (!existing) return NextResponse.json({ error: 'Moment not found' }, { status: 404 });
    await db.delete(schema.moments).where(eq(schema.moments.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting moment:', error);
    return NextResponse.json({ error: 'Failed to delete moment' }, { status: 500 });
  }
}
