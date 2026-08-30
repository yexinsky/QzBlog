import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { renderMarkdown } from '@/lib/markdown';

const createPageSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(200),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 只能包含小写字母、数字和短横线'),
  contentMd: z.string().min(1, '内容不能为空').max(200_000),
  visible: z.boolean().default(true),
});

/** GET /api/admin/pages — 自定义页面列表（PRD 11.12） */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const pages = await db.query.singlePages.findMany({
      // 页面数量少（<10），正文一并返回，前端编辑无需二次请求
      columns: { id: true, title: true, slug: true, contentMd: true, visible: true, createdAt: true, updatedAt: true },
      orderBy: [asc(schema.singlePages.createdAt)],
    });
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Failed to list pages:', error);
    return NextResponse.json({ error: 'Failed to list pages' }, { status: 500 });
  }
}

/** POST /api/admin/pages — 新建页面 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = createPageSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const duplicate = await db.query.singlePages.findFirst({ where: eq(schema.singlePages.slug, parsed.data.slug), columns: { id: true } });
    if (duplicate) return NextResponse.json({ error: '页面 slug 已存在' }, { status: 409 });

    const pageId = randomUUID();
    await db.insert(schema.singlePages).values({
      id: pageId,
      title: parsed.data.title,
      slug: parsed.data.slug,
      contentMd: parsed.data.contentMd,
      contentHtml: await renderMarkdown(parsed.data.contentMd),
      visible: parsed.data.visible,
    });
    const page = await db.query.singlePages.findFirst({ where: eq(schema.singlePages.id, pageId) });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to create page:', error);
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
