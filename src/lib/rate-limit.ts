import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// 检查 Redis 是否配置
const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// 创建 Redis 客户端（仅在配置存在时）
const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// 创建限流器的辅助函数，未配置时返回 null
function createRatelimit(prefix: string, windowSize: string, maxRequests: number) {
  if (!redis) return null;
  // 解析窗口大小
  const match = windowSize.match(/^(\d+)\s*(s|m|h)$/);
  if (!match) return null;
  const [, num, unit] = match;
  const duration = unit === 's' ? `${num} seconds` : unit === 'm' ? `${num} minutes` : `${num} hours`;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, duration as any),
    analytics: true,
    prefix: `ratelimit:${prefix}`,
  });
}

// 评论/点赞限流：10次/分钟/IP
export const commentRatelimit = createRatelimit('comment', '1m', 10);

// 登录限流：5次/分钟/IP
export const loginRatelimit = createRatelimit('login', '1m', 5);

// 全局限流：100次/分钟/IP
export const globalRatelimit = createRatelimit('global', '1m', 100);

// 动态限流：5次/分钟/IP
export const momentRatelimit = createRatelimit('moment', '1m', 5);

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
  limiter: Ratelimit | null,
  identifier?: string
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // 未配置 Redis 时跳过限流
  if (!limiter || !redis) {
    return { success: true, remaining: 100, reset: Date.now() + 60000 };
  }

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
  limiter: Ratelimit | null,
  identifierExtractor?: (req: NextRequest) => string
) {
  return async function (
    request: NextRequest
  ): Promise<{ success: boolean; response?: NextResponse }> {
    // 未配置 Redis 时跳过限流
    if (!limiter || !redis) {
      return { success: true };
    }

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
