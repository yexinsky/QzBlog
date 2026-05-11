import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { renderMarkdown, countWords, generateSummary } from '@/lib/markdown';

const draftSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  contentMd: z.string().optional(),
  summary: z.string().max(500).optional(),
  coverImage: z.string().url().optional().nullable(),
});

// 保存草稿
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = draftSchema.parse(body);

    // 查找现有文章
    const existingPost = await db.query.posts.findFirst({
      where: eq(schema.posts.id, id),
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 确保是草稿状态或用户是作者
    if (existingPost.authorId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
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
      updateData.summary = validatedData.summary || generateSummary(validatedData.contentMd);
    }

    if (validatedData.summary !== undefined) {
      updateData.summary = validatedData.summary;
    }

    if (validatedData.coverImage !== undefined) {
      updateData.coverImage = validatedData.coverImage;
    }

    // 确保是草稿状态
    if (existingPost.status !== 'draft') {
      updateData.status = 'draft';
      updateData.publishedAt = null;
    }

    // 更新文章
    const updatedPost = await db
      .update(schema.posts)
      .set(updateData)
      .where(eq(schema.posts.id, id))
      .returning();

    return NextResponse.json({
      id: updatedPost[0].id,
      savedAt: updatedPost[0].updatedAt,
      title: updatedPost[0].title,
      wordCount: updatedPost[0].wordCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving draft:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}

// 获取草稿
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.id, id),
      columns: {
        id: true,
        title: true,
        contentMd: true,
        summary: true,
        coverImage: true,
        status: true,
        scheduledAt: true,
        cancelScheduled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // 检查权限
    if (post.status === 'draft') {
      const existingPost = await db.query.posts.findFirst({
        where: eq(schema.posts.id, id),
      });

      if (existingPost && existingPost.authorId !== session.user.id && session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching draft:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draft' },
      { status: 500 }
    );
  }
}