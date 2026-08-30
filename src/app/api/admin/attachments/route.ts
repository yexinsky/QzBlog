import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { deleteFile, isSafeStorageKey } from '@/lib/storage';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  groupId: z.string().uuid().optional(),
  ungrouped: z.coerce.boolean().optional(),
  keyword: z.string().trim().max(100).optional(),
});

/** GET /api/admin/attachments — 附件分页列表（分组筛选 + 关键词搜索） */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = listQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }
    const { page, limit, groupId, ungrouped, keyword } = parsed.data;

    const whereConditions = [];
    if (ungrouped) whereConditions.push(sql`${schema.attachments.groupId} IS NULL`);
    else if (groupId) whereConditions.push(eq(schema.attachments.groupId, groupId));
    if (keyword) {
      whereConditions.push(
        or(like(schema.attachments.originalName, `%${keyword}%`), like(schema.attachments.filename, `%${keyword}%`))!
      );
    }
    const whereClause = whereConditions.length ? and(...whereConditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db.query.attachments.findMany({
        where: whereClause,
        with: { group: { columns: { id: true, displayName: true } } },
        orderBy: [desc(schema.attachments.createdAt)],
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ count: sql<number>`count(*)` }).from(schema.attachments).where(whereClause),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    return NextResponse.json({
      attachments: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Failed to list attachments:', error);
    return NextResponse.json({ error: 'Failed to list attachments' }, { status: 500 });
  }
}

const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  // v1.1（PRD 11.3）：check=true 仅做引用检查不删除，供前端「命中时二次确认」
  check: z.boolean().optional(),
});

/** DELETE /api/admin/attachments — 批量删除附件（body: { ids, check? }） */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = batchDeleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const targets = await db.query.attachments.findMany({
      where: inArray(schema.attachments.id, parsed.data.ids),
      columns: { id: true, url: true, storage: true, filename: true, originalName: true },
    });
    if (targets.length === 0) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 });
    }

    // 引用检查：文章正文 / 封面 / 动态内容 / 动态图片（PRD 11.3 删除前引用检查）
    const referenced = new Map<string, string[]>();
    for (const target of targets) {
      const usages: string[] = [];
      const [postBody] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.posts)
        .where(like(schema.posts.contentMd, `%${target.url}%`));
      if (Number(postBody?.count ?? 0) > 0) usages.push(`文章正文（${Number(postBody.count)} 处）`);
      const [postCover] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.posts)
        .where(eq(schema.posts.coverImage, target.url));
      if (Number(postCover?.count ?? 0) > 0) usages.push(`文章封面（${Number(postCover.count)} 处）`);
      const [momentBody] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.moments)
        .where(or(like(schema.moments.content, `%${target.url}%`), eq(schema.moments.imageUrl, target.url))!);
      if (Number(momentBody?.count ?? 0) > 0) usages.push(`动态（${Number(momentBody.count)} 处）`);
      if (usages.length > 0) referenced.set(target.originalName, usages);
    }

    if (parsed.data.check) {
      return NextResponse.json({ success: true, checkOnly: true, referenced: Object.fromEntries(referenced) });
    }

    let deletedFiles = 0;
    for (const target of targets) {
      await db.delete(schema.attachments).where(eq(schema.attachments.id, target.id));
      // 存储对象尽力删除：URL 形如 /api/files/{key} 或 S3 公网地址
      const key = target.url.startsWith('/api/files/') ? target.url.slice('/api/files/'.length) : extractS3Key(target.url);
      if (key && isSafeStorageKey(key)) {
        try {
          await deleteFile(key);
          deletedFiles += 1;
        } catch (error) {
          console.error(`Failed to delete stored file for attachment ${target.id}:`, error);
        }
      }
    }

    return NextResponse.json({ success: true, deleted: targets.length, deletedFiles, referenced: Object.fromEntries(referenced) });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    console.error('Failed to delete attachments:', error);
    return NextResponse.json({ error: 'Failed to delete attachments' }, { status: 500 });
  }
}

/** 从 S3 公网 URL 提取对象 key（无法识别时返回 null） */
function extractS3Key(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const key = decodeURIComponent(pathname.replace(/^\/[^/]+\//, ''));
    return key.startsWith('uploads/') ? key : null;
  } catch {
    return null;
  }
}
