import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, desc, eq, inArray, like, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { countWords, generateSlug, generateSummary, renderMarkdown } from '@/lib/markdown';
import { globalRatelimit, withRatelimit } from '@/lib/rate-limit';

const createPostSchema = z.object({
  title: z.string().trim().min(1).max(255),
  contentMd: z.string().min(1),
  summary: z.string().max(500).optional(),
  coverImage: z.string().url().optional().nullable(),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  scheduledAt: z.string().datetime().optional(),
  tagIds: z.array(z.string().uuid()).max(50).default([]),
  seriesId: z.string().uuid().optional(),
  seriesOrder: z.number().int().min(0).max(1_000_000).default(0),
  isPinned: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.status === 'scheduled' && !data.scheduledAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduledAt'], message: 'scheduledAt is required for scheduled posts' });
  }
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  tagId: z.string().uuid().optional(),
  seriesId: z.string().uuid().optional(),
  keyword: z.string().trim().max(100).optional(),
});

async function validateRelations(tagIds: string[], seriesId?: string) {
  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length !== tagIds.length) {
    throw new RelationValidationError('Duplicate tag IDs are not allowed');
  }

  if (uniqueTagIds.length > 0) {
    const existingTags = await db.select({ id: schema.tags.id }).from(schema.tags).where(inArray(schema.tags.id, uniqueTagIds));
    if (existingTags.length !== uniqueTagIds.length) {
      throw new RelationValidationError('One or more tags do not exist');
    }
  }

  if (seriesId) {
    const existingSeries = await db.select({ id: schema.series.id }).from(schema.series).where(eq(schema.series.id, seriesId)).limit(1);
    if (existingSeries.length === 0) {
      throw new RelationValidationError('Series does not exist');
    }
  }

  return uniqueTagIds;
}

class RelationValidationError extends Error {}

export async function GET(request: NextRequest) {
  try {
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) return ratelimitCheck.response!;

    const session = await getServerSession(authOptions);
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: parsed.error.errors }, { status: 400 });
    }

    const { page, limit, status, tagId, seriesId, keyword } = parsed.data;
    const isAdmin = session?.user?.role === 'admin';
    const userId = session?.user?.id;
    const now = new Date();
    const whereConditions = [];

    if (!userId) {
      whereConditions.push(eq(schema.posts.status, 'published'), lte(schema.posts.publishedAt, now));
    } else if (isAdmin) {
      if (status) whereConditions.push(eq(schema.posts.status, status));
      else whereConditions.push(or(eq(schema.posts.status, 'draft'), eq(schema.posts.status, 'scheduled'), and(eq(schema.posts.status, 'published'), lte(schema.posts.publishedAt, now)))!);
    } else {
      whereConditions.push(eq(schema.posts.authorId, userId));
      if (status) whereConditions.push(eq(schema.posts.status, status));
    }

    if (tagId) {
      whereConditions.push(sql`${schema.posts.id} IN (SELECT ${schema.postTags.postId} FROM ${schema.postTags} WHERE ${schema.postTags.tagId} = ${tagId})`);
    }
    if (seriesId) {
      whereConditions.push(sql`${schema.posts.id} IN (SELECT ${schema.seriesPosts.postId} FROM ${schema.seriesPosts} WHERE ${schema.seriesPosts.seriesId} = ${seriesId})`);
    }
    if (keyword) {
      whereConditions.push(or(like(schema.posts.title, `%${keyword}%`), like(schema.posts.summary, `%${keyword}%`))!);
    }

    const whereClause = and(...whereConditions);
    const posts = await db.query.posts.findMany({
      where: whereClause,
      with: {
        author: { columns: { id: true, username: true, avatarUrl: true } },
        tags: { with: { tag: true } },
        seriesPost: { with: { series: true } },
      },
      orderBy: [desc(schema.posts.isPinned), desc(schema.posts.publishedAt)],
      limit,
      offset: (page - 1) * limit,
    });

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.posts).where(whereClause);
    const total = Number(countResult[0]?.count ?? 0);

    return NextResponse.json({
      posts: posts.map((post) => ({
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
        scheduledAt: userId ? post.scheduledAt : undefined,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        author: { id: post.author?.id, username: post.author?.username, avatarUrl: post.author?.avatarUrl },
        tags: post.tags?.map((pt) => pt.tag) || [],
        series: post.seriesPost?.[0]?.series || null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const validatedData = createPostSchema.parse(await request.json());
    const tagIds = await validateRelations(validatedData.tagIds, validatedData.seriesId);
    let slug = generateSlug(validatedData.title) || randomUUID();
    const existingPost = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug), columns: { id: true } });
    if (existingPost) slug = `${slug}-${randomUUID().slice(0, 8)}`;

    const contentHtml = await renderMarkdown(validatedData.contentMd);
    const postId = randomUUID();
    const now = new Date();
    const publishedAt = validatedData.status === 'published' ? now : null;
    const scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null;

    await db.transaction(async (tx) => {
      await tx.insert(schema.posts).values({
        id: postId,
        authorId: session.user.id,
        title: validatedData.title,
        slug,
        contentMd: validatedData.contentMd,
        contentHtml,
        summary: validatedData.summary ?? generateSummary(validatedData.contentMd),
        coverImage: validatedData.coverImage,
        isPinned: validatedData.isPinned,
        status: validatedData.status,
        scheduledAt,
        publishedAt,
        wordCount: countWords(validatedData.contentMd),
      });
      if (tagIds.length > 0) await tx.insert(schema.postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
      if (validatedData.seriesId) await tx.insert(schema.seriesPosts).values({ id: randomUUID(), seriesId: validatedData.seriesId, postId, sortOrder: validatedData.seriesOrder });
    });

    const newPost = await db.query.posts.findFirst({ where: eq(schema.posts.id, postId) });
    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof RelationValidationError) {
      return NextResponse.json({ error: error.message, details: error instanceof z.ZodError ? error.errors : undefined }, { status: 400 });
    }
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

