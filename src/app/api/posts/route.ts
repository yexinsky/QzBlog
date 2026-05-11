import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { renderMarkdown, renderCommentMarkdown, countWords, generateSummary, generateSlug } from '@/lib/markdown';
import { withRatelimit, globalRatelimit } from '@/lib/ratelimit';

// Validation schemas
const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  contentMd: z.string().min(1),
  summary: z.string().max(500).optional(),
  coverImage: z.string().url().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  scheduledAt: z.string().datetime().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  seriesId: z.string().uuid().optional(),
  seriesOrder: z.number().int().optional(),
});

const updatePostSchema = createPostSchema.partial();

// 获取文章列表
export async function GET(request: NextRequest) {
  try {
    // 检查全局限流
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const tagId = searchParams.get('tagId');
    const seriesId = searchParams.get('seriesId');
    const keyword = searchParams.get('keyword');

    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereConditions: any[] = [];

    // 状态过滤（只显示已发布的给公众）
    if (status === 'published') {
      whereConditions.push(eq(schema.posts.status, 'published'));
    } else if (status) {
      whereConditions.push(eq(schema.posts.status, status));
    } else {
      // 默认只显示已发布的
      whereConditions.push(eq(schema.posts.status, 'published'));
    }

    // 标签过滤
    if (tagId) {
      whereConditions.push(
        sql`${schema.posts.id} IN (
          SELECT ${schema.postTags.postId}
          FROM ${schema.postTags}
          WHERE ${schema.postTags.tagId} = ${tagId}
        )`
      );
    }

    // 系列过滤
    if (seriesId) {
      whereConditions.push(
        sql`${schema.posts.id} IN (
          SELECT ${schema.seriesPosts.postId}
          FROM ${schema.seriesPosts}
          WHERE ${schema.seriesPosts.seriesId} = ${seriesId}
        )`
      );
    }

    // 关键词搜索（标题和摘要）
    if (keyword) {
      whereConditions.push(
        or(
          like(schema.posts.title, `%${keyword}%`),
          like(schema.posts.summary, `%${keyword}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // 查询文章列表
    const posts = await db.query.posts.findMany({
      where: whereClause,
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
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
        },
      },
      orderBy: [
        desc(schema.posts.isPinned),
        desc(schema.posts.publishedAt),
      ],
      limit,
      offset,
    });

    // 格式化返回数据
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      coverImage: post.coverImage,
      status: post.status,
      isPinned: post.isPinned,
      wordCount: post.wordCount,
      likeCount: post.likeCount,
      viewCount: post.viewCount,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      author: {
        id: post.author?.id,
        username: post.author?.username,
        avatarUrl: post.author?.avatarUrl,
      },
      tags: post.tags?.map((pt) => pt.tag) || [],
      series: post.seriesPost?.[0]?.series || null,
    }));

    // 获取总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.posts)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// 创建新文章
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // 只有已登录的管理员才能创建文章
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createPostSchema.parse(body);

    // 生成slug
    let slug = generateSlug(validatedData.title);

    // 检查slug唯一性
    const existingPost = await db.query.posts.findFirst({
      where: eq(schema.posts.slug, slug),
    });

    if (existingPost) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // 渲染HTML内容
    const contentHtml = await renderMarkdown(validatedData.contentMd);

    // 计算字数和摘要
    const wordCount = countWords(validatedData.contentMd);
    const summary = validatedData.summary || generateSummary(validatedData.contentMd);

    // 处理发布时间
    let publishedAt = null;
    let status = validatedData.status || 'draft';

    if (status === 'published') {
      publishedAt = new Date();
    }

    // 创建文章
    const newPost = await db
      .insert(schema.posts)
      .values({
        title: validatedData.title,
        slug,
        contentMd: validatedData.contentMd,
        contentHtml,
        summary,
        coverImage: validatedData.coverImage,
        status,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
        publishedAt,
        authorId: session.user.id,
        wordCount,
      })
      .returning();

    const postId = newPost[0].id;

    // 添加标签关联
    if (validatedData.tagIds && validatedData.tagIds.length > 0) {
      await db.insert(schema.postTags).values(
        validatedData.tagIds.map((tagId) => ({
          postId,
          tagId,
        }))
      );
    }

    // 添加系列关联
    if (validatedData.seriesId) {
      await db.insert(schema.seriesPosts).values({
        seriesId: validatedData.seriesId,
        postId,
        sortOrder: validatedData.seriesOrder || 0,
      });
    }

    return NextResponse.json(newPost[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}