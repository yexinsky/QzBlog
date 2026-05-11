import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';
import { renderMarkdown, countWords, generateSummary } from '@/lib/markdown';
import { withRatelimit, globalRatelimit } from '@/lib/ratelimit';

const updatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  contentMd: z.string().min(1).optional(),
  summary: z.string().max(500).optional(),
  coverImage: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  isPinned: z.boolean().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  cancelScheduled: z.boolean().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  seriesId: z.string().uuid().optional().nullable(),
  seriesOrder: z.number().int().optional(),
});

// 获取单篇文章
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 检查全局限流
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const session = await getServerSession(authOptions);
    const { slug } = params;

    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.slug, slug),
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
        tags: {
          with: {
            tag: true,
          },
        },
        seriesPost: {
          with: {
            series: true,
          },
          orderBy: [desc(schema.seriesPosts.sortOrder)],
        },
        comments: {
          where: eq(schema.comments.status, 'approved'),
          with: {
            author: {
              columns: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: [desc(schema.comments.isPinned), desc(schema.comments.createdAt)],
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 检查权限（草稿只能博主自己看）
    if (post.status === 'draft') {
      if (!session?.user || session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
    }

    // 增加阅读量（异步，不阻塞响应）
    db.update(schema.posts)
      .set({ viewCount: post.viewCount + 1 })
      .where(eq(schema.posts.id, post.id))
      .catch((err) => console.error('Failed to update view count:', err));

    // 获取关联文章（系列中的前一篇/后一篇）
    let seriesNav = null;
    if (post.seriesPost?.[0]) {
      const seriesId = post.seriesPost[0].seriesId;
      const sortOrder = post.seriesPost[0].sortOrder;

      const [prevPost, nextPost] = await Promise.all([
        db.query.seriesPosts.findFirst({
          where: and(
            eq(schema.seriesPosts.seriesId, seriesId),
            eq(schema.seriesPosts.sortOrder, sortOrder - 1)
          ),
          with: {
            post: {
              columns: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        }),
        db.query.seriesPosts.findFirst({
          where: and(
            eq(schema.seriesPosts.seriesId, seriesId),
            eq(schema.seriesPosts.sortOrder, sortOrder + 1)
          ),
          with: {
            post: {
              columns: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        }),
      ]);

      seriesNav = {
        series: post.seriesPost[0].series,
        prev: prevPost?.post || null,
        next: nextPost?.post || null,
      };
    }

    // 获取评论树
    const comments = post.comments || [];
    const rootComments = comments.filter((c) => c.depth === 0);
    const commentMap = new Map(comments.map((c) => [c.id, { ...c, replies: [] as any[] }]));

    comments.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      }
    });

    const formattedComments = rootComments.map((c) => commentMap.get(c.id));

    return NextResponse.json({
      ...post,
      tags: post.tags?.map((pt) => pt.tag) || [],
      seriesNav,
      comments: formattedComments,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug } = params;
    const body = await request.json();
    const validatedData = updatePostSchema.parse(body);

    // 查找现有文章
    const existingPost = await db.query.posts.findFirst({
      where: eq(schema.posts.slug, slug),
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 准备更新数据
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title;
    }

    if (validatedData.contentMd !== undefined) {
      updateData.contentMd = validatedData.contentMd;
      updateData.contentHtml = await renderMarkdown(validatedData.contentMd);
      updateData.wordCount = countWords(validatedData.contentMd);
    }

    if (validatedData.summary !== undefined) {
      updateData.summary = validatedData.summary;
    } else if (validatedData.contentMd !== undefined) {
      updateData.summary = generateSummary(validatedData.contentMd);
    }

    if (validatedData.coverImage !== undefined) {
      updateData.coverImage = validatedData.coverImage;
    }

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;

      // 设置发布时间
      if (validatedData.status === 'published' && !existingPost.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    if (validatedData.isPinned !== undefined) {
      updateData.isPinned = validatedData.isPinned;
    }

    if (validatedData.scheduledAt !== undefined) {
      updateData.scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null;
    }

    if (validatedData.cancelScheduled !== undefined) {
      updateData.cancelScheduled = validatedData.cancelScheduled;
    }

    // 更新文章
    const updatedPost = await db
      .update(schema.posts)
      .set(updateData)
      .where(eq(schema.posts.id, existingPost.id))
      .returning();

    // 更新标签
    if (validatedData.tagIds !== undefined) {
      await db.delete(schema.postTags).where(eq(schema.postTags.postId, existingPost.id));

      if (validatedData.tagIds.length > 0) {
        await db.insert(schema.postTags).values(
          validatedData.tagIds.map((tagId) => ({
            postId: existingPost.id,
            tagId,
          }))
        );
      }
    }

    // 更新系列关联
    if (validatedData.seriesId !== undefined) {
      await db.delete(schema.seriesPosts).where(eq(schema.seriesPosts.postId, existingPost.id));

      if (validatedData.seriesId) {
        await db.insert(schema.seriesPosts).values({
          seriesId: validatedData.seriesId,
          postId: existingPost.id,
          sortOrder: validatedData.seriesOrder || 0,
        });
      }
    }

    return NextResponse.json(updatedPost[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug } = params;

    const deleted = await db
      .delete(schema.posts)
      .where(eq(schema.posts.slug, slug))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}