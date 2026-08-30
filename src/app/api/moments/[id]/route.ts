import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const updateMomentSchema = z.object({
  content: z.string().trim().min(1, '动态内容不能为空').max(500, '动态内容不能超过 500 个字符').optional(),
  imageUrl: z.union([z.string().trim().url('图片地址格式不正确'), z.literal(''), z.null()]).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, { message: '至少需要更新一个字段' });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
    const { id } = await params;
    const existing = await db.query.moments.findFirst({ where: eq(schema.moments.id, id) });
    if (!existing) return NextResponse.json({ error: 'Moment not found' }, { status: 404 });

    const validatedData = updateMomentSchema.parse(await request.json());
    await db.update(schema.moments).set({
      ...(validatedData.content !== undefined ? { content: validatedData.content } : {}),
      ...(validatedData.imageUrl !== undefined ? { imageUrl: validatedData.imageUrl || null } : {}),
      updatedAt: new Date(),
    }).where(eq(schema.moments.id, id));
    const updatedMoment = await db.query.moments.findFirst({ where: eq(schema.moments.id, id) });
    return NextResponse.json(updatedMoment);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Error updating moment:', error);
    return NextResponse.json({ error: 'Failed to update moment' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;
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
