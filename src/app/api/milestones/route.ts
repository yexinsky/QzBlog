import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { withRatelimit, globalRatelimit } from '@/lib/ratelimit';

// Validation schemas
const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  eventDate: z.string(), // date format YYYY-MM-DD
  eventType: z.enum(['work', 'study', 'open_source', 'speech', 'other']),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isPublic: z.boolean().optional(),
});

const updateMilestoneSchema = createMilestoneSchema.partial();

// 获取时间线列表
export async function GET(request: NextRequest) {
  try {
    // 检查全局限流
    const ratelimitCheck = await withRatelimit(globalRatelimit)(request);
    if (!ratelimitCheck.success) {
      return ratelimitCheck.response!;
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const isPublic = searchParams.get('isPublic');

    let whereCondition: any = {};

    if (eventType) {
      whereCondition.eventType = eventType;
    }

    if (isPublic === 'true') {
      whereCondition.isPublic = true;
    }

    const milestones = await db.query.milestones.findMany({
      where: Object.keys(whereCondition).length > 0 ? whereCondition : undefined,
      orderBy: [desc(schema.milestones.eventDate), desc(schema.milestones.sortOrder)],
    });

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    );
  }
}

// 创建里程碑
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
    const validatedData = createMilestoneSchema.parse(body);

    const newMilestone = await db
      .insert(schema.milestones)
      .values({
        title: validatedData.title,
        description: validatedData.description,
        eventDate: new Date(validatedData.eventDate),
        eventType: validatedData.eventType,
        icon: validatedData.icon,
        sortOrder: validatedData.sortOrder || 0,
        isPublic: validatedData.isPublic !== false,
      })
      .returning();

    return NextResponse.json(newMilestone[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    );
  }
}