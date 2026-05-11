import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { withRatelimit, globalRatelimit } from '@/lib/ratelimit';

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  techStack: z.array(z.string()),
  coverImage: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  starCount: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const updateProjectSchema = createProjectSchema.partial();

// 获取项目列表
export async function GET(request: NextRequest) {
  try {
    // 检查全局限流
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const projects = await db.query.projects.findMany({
      orderBy: [
        desc(schema.projects.isFeatured),
        desc(schema.projects.sortOrder),
        desc(schema.projects.createdAt),
      ],
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// 创建项目
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    const newProject = await db
      .insert(schema.projects)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        techStack: validatedData.techStack,
        coverImage: validatedData.coverImage,
        githubUrl: validatedData.githubUrl,
        demoUrl: validatedData.demoUrl,
        starCount: validatedData.starCount || 0,
        isFeatured: validatedData.isFeatured || false,
        sortOrder: validatedData.sortOrder || 0,
      })
      .returning();

    return NextResponse.json(newProject[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}