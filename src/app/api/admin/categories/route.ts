import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { generateSlug } from '@/lib/markdown';

const createCategorySchema = z.object({
  name: z.string().trim().min(1, '分类名称不能为空').max(100, '分类名称最多 100 个字符'),
  slug: z
    .string()
    .trim()
    .max(100, '别名最多 100 个字符')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '别名只能包含小写字母、数字和短横线')
    .optional(),
  description: z.string().trim().max(500, '描述最多 500 个字符').optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
});

/** GET /api/admin/categories — 分类列表（含已发布文章计数） */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const rows = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
        slug: schema.categories.slug,
        description: schema.categories.description,
        sortOrder: schema.categories.sortOrder,
        createdAt: schema.categories.createdAt,
        updatedAt: schema.categories.updatedAt,
        // 注意：相关子查询必须写死表前缀 —— drizzle 的 sql 模板会把 Column 插值渲染成
        // 不带表名的裸列名，跨表关联会指向子查询自身的作用域而得到错误结果。
        postCount: sql<number>`(
          SELECT count(*) FROM \`posts\`
          WHERE \`posts\`.\`category_id\` = \`categories\`.\`id\`
            AND \`posts\`.\`status\` = 'published'
        )`,
      })
      .from(schema.categories)
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.createdAt));

    return NextResponse.json({
      categories: rows.map((row) => ({ ...row, postCount: Number(row.postCount ?? 0) })),
    });
  } catch (error) {
    console.error('Failed to list categories:', error);
    return NextResponse.json({ error: 'Failed to list categories' }, { status: 500 });
  }
}

/** POST /api/admin/categories — 新建分类 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = createCategorySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const slug = parsed.data.slug || generateSlug(parsed.data.name);
    if (!slug) {
      return NextResponse.json({ error: '无法从名称生成别名，请手动填写 slug' }, { status: 400 });
    }

    const existing = await db.query.categories.findFirst({ where: eq(schema.categories.slug, slug), columns: { id: true } });
    if (existing) {
      return NextResponse.json({ error: '分类别名已存在' }, { status: 409 });
    }

    const categoryId = randomUUID();
    await db.insert(schema.categories).values({
      id: categoryId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder ?? 0,
    });
    const category = await db.query.categories.findFirst({ where: eq(schema.categories.id, categoryId) });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to create category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
