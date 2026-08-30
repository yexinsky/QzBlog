import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

const updateCategorySchema = z.object({
  name: z.string().trim().min(1, '分类名称不能为空').max(100, '分类名称最多 100 个字符').optional(),
  slug: z
    .string()
    .trim()
    .min(1, '别名不能为空')
    .max(100, '别名最多 100 个字符')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '别名只能包含小写字母、数字和短横线')
    .optional(),
  description: z.string().trim().max(500, '描述最多 500 个字符').optional().nullable(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/** PUT /api/admin/categories/[id] — 更新分类 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const existing = await db.query.categories.findFirst({ where: eq(schema.categories.id, id) });
    if (!existing) return NextResponse.json({ error: '分类不存在' }, { status: 404 });

    const parsed = updateCategorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const duplicate = await db.query.categories.findFirst({
        where: eq(schema.categories.slug, parsed.data.slug),
        columns: { id: true },
      });
      if (duplicate) return NextResponse.json({ error: '分类别名已存在' }, { status: 409 });
    }

    await db
      .update(schema.categories)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.categories.id, id));

    const category = await db.query.categories.findFirst({ where: eq(schema.categories.id, id) });
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to update category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

/** DELETE /api/admin/categories/[id] — 删除分类，分类下文章自动转为「未分类」 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const { id } = await params;
    const existing = await db.query.categories.findFirst({ where: eq(schema.categories.id, id) });
    if (!existing) return NextResponse.json({ error: '分类不存在' }, { status: 404 });

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.posts)
      .where(eq(schema.posts.categoryId, id));

    // posts.category_id 外键为 ON DELETE SET NULL：删除后文章自动回到「未分类」
    await db.delete(schema.categories).where(eq(schema.categories.id, id));

    return NextResponse.json({ success: true, detachedPosts: Number(countRow?.count ?? 0) });
  } catch (error) {
    console.error('Failed to delete category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
