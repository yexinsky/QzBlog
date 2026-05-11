import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// 创建 Redis 客户端
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 评论/点赞限流：10次/分钟/IP
export const commentRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:comment',
});

// 登录限流：5次/分钟/IP
export const loginRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:login',
});

// 全局限流：100次/分钟/IP
export const globalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:global',
});

// 动态限流：5次/分钟/IP
export const momentRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:moment',
});

/**
 * 从请求中获取客户端IP
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}

/**
 * 通用限流检查中间件
 */
export async function checkRatelimit(
  request: NextRequest,
  limiter: Ratelimit,
  identifier?: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const ip = identifier || getClientIP(request);

  const result = await limiter.limit(ip);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * 创建限流响应头
 */
export function createRatelimitHeaders(result: {
  success: boolean;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.reset),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
}

/**
 * 创建限流错误响应
 */
export function createRatelimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    }
  );
}

/**
 * 组合中间件函数，用于在API路由中使用
 */
export function withRatelimit(
  limiter: Ratelimit,
  identifierExtractor?: (req: NextRequest) => string
) {
  return async function (
    request: NextRequest
  ): Promise<{ success: boolean; response?: NextResponse }> {
    const identifier = identifierExtractor
      ? identifierExtractor(request)
      : getClientIP(request);

    const result = await checkRatelimit(request, limiter, identifier);

    if (!result.success) {
      return {
        success: false,
        response: createRatelimitResponse(),
      };
    }

    return { success: true };
  };
}