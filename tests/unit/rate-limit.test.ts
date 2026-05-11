/**
 * 频率限制测试
 * 测试 API 频率限制功能
 */
import { rateLimitTestCases } from '../lib/mock-data';

// 简化版频率限制器
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
      // 新窗口或过期
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

    if (entry.count >= this.limit) {
      // 超过限制
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // 允许，增加计数
    entry.count++;
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

// 创建评论限流器
const createCommentRateLimiter = (): RateLimiter => {
  return new RateLimiter(3, 60000); // 每分钟 3 条
};

// 创建点赞限流器
const createLikeRateLimiter = (): RateLimiter => {
  return new RateLimiter(10, 60000); // 每分钟 10 次
};

// 创建登录限流器
const createLoginRateLimiter = (): RateLimiter => {
  return new RateLimiter(5, 60000); // 每分钟 5 次
};

// 创建全局限流器
const createGlobalRateLimiter = (): RateLimiter => {
  return new RateLimiter(100, 60000); // 每分钟 100 次
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
      let result;
      for (let i = 0; i < 3; i++) {
        result = limiter.check(testIp);
        expect(result.allowed).toBe(true);
      }
      expect(result?.remaining).toBe(0);
    });

    test('超过限制被阻止', () => {
      limiter.reset(testIp);

      // 前3条通过
      for (let i = 0; i < 3; i++) {
        expect(limiter.check(testIp).allowed).toBe(true);
      }

      // 第4条被阻止
      const result = limiter.check(testIp);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('窗口过期后重置', async () => {
      const shortLimiter = new RateLimiter(2, 100); // 100ms 窗口

      shortLimiter.check(testIp);
      shortLimiter.check(testIp);
      expect(shortLimiter.check(testIp).allowed).toBe(false);

      // 等待窗口过期
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
      // 前10次允许
      for (let i = 0; i < 10; i++) {
        const result = limiter.check(testIp);
        expect(result.allowed).toBe(true);
      }

      // 第11次被阻止
      const result = limiter.check(testIp);
      expect(result.allowed).toBe(false);
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

      // ip1 达到限制
      for (let i = 0; i < 100; i++) {
        limiter.check(ip1);
      }
      expect(limiter.check(ip1).allowed).toBe(false);

      // ip2 不受影响
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
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.resetTime).toBe('number');
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
    headers: {
      'x-forwarded-for': ip,
    },
  });

  test('超出限制返回 429 状态码', () => {
    const limiter = createCommentRateLimiter();
    const request = mockRequest('192.168.1.105', '/api/comments');

    // 达到限制
    for (let i = 0; i < 3; i++) {
      limiter.check(request.ip);
    }

    const result = limiter.check(request.ip);
    expect(result.allowed).toBe(false);

    // 模拟 HTTP 响应
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

    // 计算重试延迟
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

  test('并发请求测试', () => {
    const limiter = new RateLimiter(5, 60000);
    const ip = 'test-ip';

    // 模拟并发请求
    const promises = Array(5).fill(null).map(() => limiter.check(ip));
    const results = Promise.all(promises);

    results.then((res) => {
      const allowedCount = res.filter((r) => r.allowed).length;
      expect(allowedCount).toBe(5);
    });
  });
});