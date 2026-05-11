import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { renderCommentMarkdown } from '@/lib/markdown';
import { withRatelimit, commentRatelimit, globalRatelimit } from '@/lib/ratelimit';
import { getClientIP } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Validation schemas
const createCommentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email(),
  contentMd: z.string().min(1).max(2000),
});

const updateCommentSchema = z.object({
  authorName: z.string().min(1).max(100).optional(),
  authorEmail: z.string().email().optional(),
  contentMd: z.string().min(1).max(2000).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  isPinned: z.boolean().optional(),
});

// 获取文章评论列表
export async function GET(request: NextRequest) {
  try {
    // 检查全局限流
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    const comments = await db.query.comments.findMany({
      where: and(
        eq(schema.comments.postId, postId),
        eq(schema.comments.status, 'approved')
      ),
      orderBy: [desc(schema.comments.isPinned), desc(schema.comments.createdAt)],
      limit,
      offset,
    });

    // 构建评论树
    const commentMap = new Map(comments.map((c) => [c.id, { ...c, replies: [] as any[] }]));

    comments.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      }
    });

    // 只返回根评论
    const rootComments = comments.filter((c) => c.depth === 0);
    const formattedComments = rootComments.map((c) => commentMap.get(c.id));

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.comments)
      .where(and(
        eq(schema.comments.postId, postId),
        eq(schema.comments.status, 'approved'),
        eq(schema.comments.depth, 0)
      ));

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// 创建评论
export async function POST(request: NextRequest) {
  try {
    // 检查评论限流
    const ratelimitCheck = await withRatelimit(commentRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // 检查文章是否存在
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.id, validatedData.postId),
      columns: { id: true, status: true },
    });

    if (!post || post.status !== 'published') {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 处理嵌套回复
    let depth = 0;
    let rootId: string | null = null;

    if (validatedData.parentId) {
      const parentComment = await db.query.comments.findFirst({
        where: eq(schema.comments.id, validatedData.parentId),
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }

      // 最多嵌套2层（根评论=0，对根评论的回复=1）
      if (parentComment.depth >= 1) {
        return NextResponse.json(
          { error: 'Maximum nesting depth exceeded' },
          { status: 400 }
        );
      }

      depth = parentComment.depth + 1;
      rootId = parentComment.rootId || parentComment.id;
    }

    // 渲染评论HTML内容
    const contentHtml = await renderCommentMarkdown(validatedData.contentMd);

    // 获取客户端IP
    const ipAddress = getClientIP(request);

    // 创建评论（默认pending状态，需要审核）
    const newComment = await db
      .insert(schema.comments)
      .values({
        postId: validatedData.postId,
        parentId: validatedData.parentId || null,
        rootId: rootId,
        depth,
        authorName: validatedData.authorName,
        authorEmail: validatedData.authorEmail,
        contentMd: validatedData.contentMd,
        contentHtml,
        status: 'pending', // 默认需要审核
        ipAddress,
      })
      .returning();

    return NextResponse.json(
      {
        ...newComment[0],
        message: 'Comment submitted and pending approval',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// 更新评论（博主操作）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateCommentSchema.parse(body);

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.contentMd !== undefined) {
      updateData.contentMd = validatedData.contentMd;
      updateData.contentHtml = await renderCommentMarkdown(validatedData.contentMd);
    }

    if (validatedData.authorName !== undefined) {
      updateData.authorName = validatedData.authorName;
    }

    if (validatedData.authorEmail !== undefined) {
      updateData.authorEmail = validatedData.authorEmail;
    }

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
    }

    if (validatedData.isPinned !== undefined) {
      updateData.isPinned = validatedData.isPinned;
    }

    const updatedComment = await db
      .update(schema.comments)
      .set(updateData)
      .where(eq(schema.comments.id, commentId))
      .returning();

    if (updatedComment.length === 0) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedComment[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// 删除评论（博主操作）
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(schema.comments)
      .where(eq(schema.comments.id, commentId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}