import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { countWords, generateSummary, renderMarkdown } from '@/lib/markdown';
import { globalRatelimit, withRatelimit } from '@/lib/rate-limit';
import { fireNotify } from '@/lib/notify';

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  contentMd: z.string().min(1).optional(),
  summary: z.string().max(500).optional(),
  coverImage: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  isPinned: z.boolean().optional(),
  // v1.1（PRD 11.5 / 11.6）
  visibility: z.enum(['public', 'private']).optional(),
  allowComment: z.boolean().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  cancelScheduled: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).max(50).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  seriesId: z.string().uuid().optional().nullable(),
  seriesOrder: z.number().int().min(0).max(1_000_000).optional(),
}).superRefine((data, ctx) => {
  if (data.status === 'scheduled' && !data.scheduledAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduledAt'], message: 'scheduledAt is required for scheduled posts' });
  }
});

class RelationValidationError extends Error {}

async function validateRelations(tagIds?: string[], seriesId?: string | null, categoryId?: string | null) {
  const uniqueTagIds = tagIds === undefined ? undefined : [...new Set(tagIds)];
  if (tagIds && uniqueTagIds!.length !== tagIds.length) throw new RelationValidationError('Duplicate tag IDs are not allowed');
  if (uniqueTagIds && uniqueTagIds.length > 0) {
    const tags = await db.select({ id: schema.tags.id }).from(schema.tags).where(inArray(schema.tags.id, uniqueTagIds));
    if (tags.length !== uniqueTagIds.length) throw new RelationValidationError('One or more tags do not exist');
  }
  if (seriesId) {
    const series = await db.select({ id: schema.series.id }).from(schema.series).where(eq(schema.series.id, seriesId)).limit(1);
    if (series.length === 0) throw new RelationValidationError('Series does not exist');
  }
  if (categoryId) {
    const category = await db.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.id, categoryId)).limit(1);
    if (category.length === 0) throw new RelationValidationError('Category does not exist');
  }
  return uniqueTagIds;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) return ratelimitCheck.response!;

    const session = await getServerSession(authOptions);
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.slug, slug),
      with: {
        author: { columns: { id: true, username: true, avatarUrl: true, bio: true } },
        category: { columns: { id: true, name: true, slug: true } },
        tags: { with: { tag: true } },
        seriesPost: { with: { series: true }, orderBy: [desc(schema.seriesPosts.sortOrder)] },
      },
    });

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const isOwner = session?.user?.id === post.authorId;
    const canManage = session?.user?.role === 'admin' || isOwner;
    // v1.1：回收站文章对所有人不可见（PRD 11.4）；私有文章仅博主可见（PRD 11.6）
    if (post.status === 'recycled') return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (post.visibility === 'private' && !canManage) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const isPublic = post.status === 'published' && post.publishedAt !== null && post.publishedAt <= new Date();
    if (!isPublic && !canManage) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    if (isPublic) {
      void db.update(schema.posts).set({ viewCount: post.viewCount + 1 }).where(eq(schema.posts.id, post.id)).catch((err) => console.error('Failed to update view count:', err));
    }

    // v1.1：评论改为多态 target，按 targetType='post' + targetId 查询
    const approvedComments = await db.query.comments.findMany({
      where: and(
        eq(schema.comments.targetType, 'post'),
        eq(schema.comments.targetId, post.id),
        eq(schema.comments.status, 'approved')
      ),
      columns: {
        id: true,
        targetType: true,
        targetId: true,
        parentId: true,
        rootId: true,
        depth: true,
        authorName: true,
        contentHtml: true,
        isPinned: true,
        createdAt: true,
      },
      orderBy: [desc(schema.comments.isPinned), desc(schema.comments.createdAt)],
    });

    let seriesNav = null;
    if (post.seriesPost?.[0]) {
      const relation = post.seriesPost[0];
      const [prevPost, nextPost] = await Promise.all([
        db.query.seriesPosts.findFirst({
          where: and(eq(schema.seriesPosts.seriesId, relation.seriesId), eq(schema.seriesPosts.sortOrder, relation.sortOrder - 1)),
          with: { post: { columns: { id: true, title: true, slug: true, status: true, publishedAt: true } } },
        }),
        db.query.seriesPosts.findFirst({
          where: and(eq(schema.seriesPosts.seriesId, relation.seriesId), eq(schema.seriesPosts.sortOrder, relation.sortOrder + 1)),
          with: { post: { columns: { id: true, title: true, slug: true, status: true, publishedAt: true } } },
        }),
      ]);
      const visible = (item: typeof prevPost) => !item?.post ? null : canManage || (item.post.status === 'published' && item.post.publishedAt && item.post.publishedAt <= new Date()) ? { id: item.post.id, title: item.post.title, slug: item.post.slug } : null;
      seriesNav = { series: relation.series, prev: visible(prevPost), next: visible(nextPost) };
    }

    const comments = approvedComments;
    const roots = comments.filter((comment) => comment.depth === 0);
    type PublicComment = (typeof comments)[number];
    const map = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] as PublicComment[] }]));
    for (const comment of comments) {
      if (comment.parentId) map.get(comment.parentId)?.replies.push(map.get(comment.id)!);
    }

    const response = {
      ...post,
      ...(canManage ? {} : { authorId: undefined, scheduledAt: undefined, cancelScheduled: undefined }),
      tags: post.tags?.map((pt) => pt.tag) || [],
      seriesNav,
      comments: roots.map((comment) => map.get(comment.id)),
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const validatedData = updatePostSchema.parse(await request.json());
    const existingPost = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug) });
    if (!existingPost) return NextResponse.json({ error: 'Post not found' }, { status: 404 });


    const tagIds = await validateRelations(validatedData.tagIds, validatedData.seriesId, validatedData.categoryId);
    const updateData: Partial<typeof schema.posts.$inferInsert> = { updatedAt: new Date() };
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.categoryId !== undefined) updateData.categoryId = validatedData.categoryId;
    if (validatedData.contentMd !== undefined) {
      updateData.contentMd = validatedData.contentMd;
      updateData.contentHtml = await renderMarkdown(validatedData.contentMd);
      updateData.wordCount = countWords(validatedData.contentMd);
      if (validatedData.summary === undefined) updateData.summary = generateSummary(validatedData.contentMd);
    }
    if (validatedData.summary !== undefined) updateData.summary = validatedData.summary;
    if (validatedData.coverImage !== undefined) updateData.coverImage = validatedData.coverImage;
    if (validatedData.isPinned !== undefined) updateData.isPinned = validatedData.isPinned;
    if (validatedData.visibility !== undefined) updateData.visibility = validatedData.visibility;
    if (validatedData.allowComment !== undefined) updateData.allowComment = validatedData.allowComment;
    if (validatedData.cancelScheduled !== undefined) updateData.cancelScheduled = validatedData.cancelScheduled;
    if (validatedData.scheduledAt !== undefined) updateData.scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null;
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      if (validatedData.status === 'published') {
        updateData.publishedAt = existingPost.publishedAt ?? new Date();
        updateData.scheduledAt = null;
        updateData.cancelScheduled = false;
        // v1.1（PRD 11.9）：首次发布时推送通知
        if (existingPost.status !== 'published') {
          const titleForNotify = validatedData.title ?? existingPost.title;
          fireNotify('post.published', {
            title: '文章发布成功',
            summary: `**《${titleForNotify}》** 已发布`,
          });
        }
      } else if (validatedData.status === 'scheduled') {
        updateData.publishedAt = null;
        updateData.cancelScheduled = false;
      } else {
        updateData.publishedAt = null;
      }
    }

    await db.transaction(async (tx) => {
      await tx.update(schema.posts).set(updateData).where(eq(schema.posts.id, existingPost.id));
      if (tagIds !== undefined) {
        await tx.delete(schema.postTags).where(eq(schema.postTags.postId, existingPost.id));
        if (tagIds.length > 0) await tx.insert(schema.postTags).values(tagIds.map((tagId) => ({ postId: existingPost.id, tagId })));
      }
      if (validatedData.seriesId !== undefined) {
        await tx.delete(schema.seriesPosts).where(eq(schema.seriesPosts.postId, existingPost.id));
        if (validatedData.seriesId) await tx.insert(schema.seriesPosts).values({ id: randomUUID(), seriesId: validatedData.seriesId, postId: existingPost.id, sortOrder: validatedData.seriesOrder ?? 0 });
      } else if (validatedData.seriesOrder !== undefined) {
        await tx.update(schema.seriesPosts).set({ sortOrder: validatedData.seriesOrder }).where(eq(schema.seriesPosts.postId, existingPost.id));
      }
    });

    const updatedPost = await db.query.posts.findFirst({ where: eq(schema.posts.id, existingPost.id) });
    return NextResponse.json(updatedPost);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof RelationValidationError) {
      return NextResponse.json({ error: error.message, details: error instanceof z.ZodError ? error.errors : undefined }, { status: 400 });
    }
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const post = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug) });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // v1.1（PRD 11.4）：删除进回收站，可从 /console/posts/recycle-bin 恢复或彻底删除
    await db.update(schema.posts).set({ status: 'recycled', updatedAt: new Date() }).where(eq(schema.posts.id, post.id));
    return NextResponse.json({ success: true, recycled: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}


