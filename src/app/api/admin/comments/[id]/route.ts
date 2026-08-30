import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';

const idSchema = z.string().uuid();
const updateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  isPinned: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, { message: 'At least one field is required' });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { id } = await params;
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.errors }, { status: 400 });
    }

    const existing = await db.query.comments.findFirst({
      where: eq(schema.comments.id, parsedId.data),
      columns: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    await db.update(schema.comments).set(parsed.data).where(eq(schema.comments.id, parsedId.data));
    const updated = await db.query.comments.findFirst({
      where: eq(schema.comments.id, parsedId.data),
      columns: { id: true, status: true, isPinned: true },
    });
    return NextResponse.json({ comment: updated });
  } catch (error) {
    console.error('Error updating admin comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;
    const { id } = await params;
    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
    const existing = await db.query.comments.findFirst({
      where: eq(schema.comments.id, parsedId.data),
      columns: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    await db.delete(schema.comments).where(eq(schema.comments.id, parsedId.data));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
