import { randomUUID } from 'crypto';
import { asc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { countWords } from '@/lib/markdown';

export const MAX_REVISIONS_PER_POST = 20;

/**
 * 保存/发布时生成内容快照（PRD 11.13）。
 * 每篇上限 20 条，超出滚动淘汰最旧。
 */
export async function createPostRevision(postId: string, title: string, contentMd: string, createdBy?: string | null): Promise<void> {
  await db.insert(schema.postRevisions).values({
    id: randomUUID(),
    postId,
    title,
    contentMd,
    wordCount: countWords(contentMd),
    createdBy: createdBy ?? null,
  });

  // 滚动淘汰：按时间倒序保留最新 N 条
  await db.execute(sql`
    DELETE FROM ${schema.postRevisions}
    WHERE ${schema.postRevisions.postId} = ${postId}
      AND ${schema.postRevisions.id} NOT IN (
        SELECT id FROM (
          SELECT id FROM ${schema.postRevisions}
          WHERE post_id = ${postId}
          ORDER BY created_at DESC
          LIMIT ${MAX_REVISIONS_PER_POST}
        ) AS keep_latest
      )
  `);
}

export async function listPostRevisions(postId: string) {
  return db.query.postRevisions.findMany({
    where: eq(schema.postRevisions.postId, postId),
    columns: { id: true, title: true, wordCount: true, createdAt: true },
    orderBy: [asc(schema.postRevisions.createdAt)],
  });
}
