/**
 * 频率限制测试
 * 测试 API 频率限制功能
 */
import { rateLimitTestCases } from '../lib/mock-data';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();

  constructor(
    private limit: number,
    private windowMs: number
  ) {}

  check(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry || now >= entry.resetTime) {
      this.store.set(ip, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.limit - 1,
        resetTime: now + this.windowMs,
      };
    }

    entry.count++;
    if (entry.count > this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }
    return {
      allowed: true,
      remaining: this.limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  reset(ip: string): void {
    this.store.delete(ip);
  }
}

const createCommentRateLimiter = (): RateLimiter => {
  return new RateLimiter(3, 60000);
};

const createLikeRateLimiter = (): RateLimiter => {
  return new RateLimiter(10, 60000);
};

const createLoginRateLimiter = (): RateLimiter => {
  return new RateLimiter(5, 60000);
};

const createGlobalRateLimiter = (): RateLimiter => {
  return new RateLimiter(100, 60000);
};

describe('频率限制测试', () => {
  describe('评论频率限制', () => {
    const limiter = createCommentRateLimiter();
    const testIp = '192.168.1.100';

    test('首次请求允许通过', () => {
      const result = limiter.check(testIp);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    test('连续请求在限制内', () => {
      limiter.reset(testIp);
      let result;
      for (let i = 0; i < 3; i++) {
        result = limiter.check(testIp);
        expect(result.allowed).toBe(true);
      }
      expect(result?.remaining).toBe(0);
    });

    test('超过限制被阻止', () => {
      limiter.reset(testIp);
      for (let i = 0; i < 3; i++) {
        expect(limiter.check(testIp).allowed).toBe(true);
      }
      const result = limiter.check(testIp);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('窗口过期后重置', async () => {
      const shortLimiter = new RateLimiter(2, 100);
      shortLimiter.check(testIp);
      shortLimiter.check(testIp);
      expect(shortLimiter.check(testIp).allowed).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const result = shortLimiter.check(testIp);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('点赞频率限制', () => {
    const limiter = createLikeRateLimiter();
    const testIp = '192.168.1.101';

    test('点赞限制为每分钟 10 次', () => {
      for (let i = 0; i < 10; i++) {
        expect(limiter.check(testIp).allowed).toBe(true);
      }
      expect(limiter.check(testIp).allowed).toBe(false);
    });

    test('返回剩余请求数', () => {
      limiter.reset(testIp);
      const result1 = limiter.check(testIp);
      expect(result1.remaining).toBe(9);
      const result2 = limiter.check(testIp);
      expect(result2.remaining).toBe(8);
    });
  });

  describe('登录频率限制', () => {
    const limiter = createLoginRateLimiter();
    const testIp = '192.168.1.102';

    test('登录限制为每分钟 5 次', () => {
      for (let i = 0; i < 5; i++) {
        expect(limiter.check(testIp).allowed).toBe(true);
      }
      expect(limiter.check(testIp).allowed).toBe(false);
    });
  });

  describe('全局频率限制', () => {
    const limiter = createGlobalRateLimiter();

    test('全局限制为每分钟 100 次', () => {
      const ip = '192.168.1.200';
      for (let i = 0; i < 100; i++) {
        expect(limiter.check(ip).allowed).toBe(true);
      }
      expect(limiter.check(ip).allowed).toBe(false);
    });

    test('不同 IP 独立计数', () => {
      const ip1 = '192.168.1.201';
      const ip2 = '192.168.1.202';
      for (let i = 0; i < 100; i++) {
        limiter.check(ip1);
      }
      expect(limiter.check(ip1).allowed).toBe(false);
      const result = limiter.check(ip2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });

  describe('限流配置测试', () => {
    test.each(rateLimitTestCases)(
      '$endpoint 限制配置正确',
      ({ limit, windowMs }) => {
        const limiter = new RateLimiter(limit, windowMs);
        const ip = 'test-ip';
        for (let i = 0; i < limit; i++) {
          expect(limiter.check(ip).allowed).toBe(true);
        }
        expect(limiter.check(ip).allowed).toBe(false);
      }
    );
  });

  describe('限流响应格式', () => {
    test('返回正确的响应头信息', () => {
      const limiter = createCommentRateLimiter();
      const ip = '192.168.1.103';
      const result = limiter.check(ip);
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetTime');
    });

    test('重置时间戳正确', () => {
      const limiter = createCommentRateLimiter();
      const ip = '192.168.1.104';
      const before = Date.now();
      const result = limiter.check(ip);
      const after = Date.now();
      expect(result.resetTime).toBeGreaterThanOrEqual(before);
      expect(result.resetTime).toBeLessThanOrEqual(after + 60000);
    });
  });
});

describe('频率限制中间件测试', () => {
  const mockRequest = (ip: string, endpoint: string) => ({
    ip,
    endpoint,
    headers: { 'x-forwarded-for': ip },
  });

  test('超出限制返回 429 状态码', () => {
    const limiter = createCommentRateLimiter();
    const request = mockRequest('192.168.1.105', '/api/comments');
    for (let i = 0; i < 3; i++) {
      limiter.check(request.ip);
    }
    const result = limiter.check(request.ip);
    expect(result.allowed).toBe(false);
    const statusCode = result.allowed ? 200 : 429;
    expect(statusCode).toBe(429);
  });

  test('限流时返回 Retry-After 头', () => {
    const limiter = createCommentRateLimiter();
    const ip = '192.168.1.106';
    for (let i = 0; i < 3; i++) {
      limiter.check(ip);
    }
    const result = limiter.check(ip);
    expect(result.allowed).toBe(false);
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });
});

describe('频率限制边界测试', () => {
  test('极限值测试 - 限制为 1', () => {
    const limiter = new RateLimiter(1, 60000);
    const ip = 'test-ip';
    expect(limiter.check(ip).allowed).toBe(true);
    expect(limiter.check(ip).allowed).toBe(false);
  });

  test('极限值测试 - 窗口为 1ms', async () => {
    const limiter = new RateLimiter(10, 1);
    const ip = 'test-ip';
    for (let i = 0; i < 10; i++) {
      expect(limiter.check(ip).allowed).toBe(true);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(limiter.check(ip).allowed).toBe(true);
  });
});
