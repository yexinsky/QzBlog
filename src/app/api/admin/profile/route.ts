import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';

const profileSchema = z.object({
  username: z.string().trim().min(1, '用户名不能为空').max(50, '用户名最多 50 个字符')
    .regex(/^[\p{L}\p{N}_.-]+$/u, '用户名只能包含文字、数字、下划线、点和短横线'),
  email: z.string().trim().email('请输入有效的邮箱地址').max(255),
  avatarUrl: z.union([z.string().trim().url('请输入有效的头像 URL').max(500), z.literal('')]).optional(),
  bio: z.string().trim().max(2000, '简介最多 2000 个字符').optional(),
}).strict();

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (session.user.role !== 'admin') return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { session };
}

const columns = { id: true, username: true, email: true, avatarUrl: true, bio: true, updatedAt: true } as const;

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, auth.session.user.id), columns });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Failed to load admin profile:', error);
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const duplicate = await db.query.users.findFirst({
      where: or(eq(schema.users.username, parsed.data.username), eq(schema.users.email, parsed.data.email)),
      columns: { id: true },
    });
    if (duplicate && duplicate.id !== auth.session.user.id) {
      return NextResponse.json({ error: '用户名或邮箱已被使用' }, { status: 409 });
    }

    await db.update(schema.users).set({
      username: parsed.data.username,
      email: parsed.data.email,
      avatarUrl: parsed.data.avatarUrl || null,
      bio: parsed.data.bio || null,
      updatedAt: new Date(),
    }).where(eq(schema.users.id, auth.session.user.id));

    const user = await db.query.users.findFirst({ where: eq(schema.users.id, auth.session.user.id), columns });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to update admin profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
