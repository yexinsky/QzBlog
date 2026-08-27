/**
 * Validates the safe in-memory fallback path of src/lib/rate-limit.ts.
 */

describe('rate-limit in-memory fallback', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('reports backend=memory when Upstash is unconfigured', async () => {
    const mod = await import('@/lib/rate-limit');
    expect(mod.getRateLimiterBackend()).toBe('memory');
  });

  it('admits 100 calls then blocks on the 101st (globalRatelimit)', async () => {
    const mod = await import('@/lib/rate-limit');
    expect(mod.getRateLimiterBackend()).toBe('memory');
    for (let i = 0; i < 100; i++) {
      const r = await mod.globalRatelimit.limit('203.0.113.1');
      expect(r.success).toBe(true);
    }
    const blocked = await mod.globalRatelimit.limit('203.0.113.1');
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(typeof blocked.reset).toBe('number');
  });

  it('tracks different identifiers independently', async () => {
    const mod = await import('@/lib/rate-limit');
    const a = await mod.commentRatelimit.limit('198.51.100.10');
    const b = await mod.commentRatelimit.limit('198.51.100.11');
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
  });

  it('blocks the 6th login attempt for the same identifier', async () => {
    const mod = await import('@/lib/rate-limit');
    const id = '192.0.2.7';
    for (let i = 0; i < 5; i++) {
      const r = await mod.loginRatelimit.limit(id);
      expect(r.success).toBe(true);
    }
    const blocked = await mod.loginRatelimit.limit(id);
    expect(blocked.success).toBe(false);
  });
});

describe('trusted proxy handling', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  it('ignores spoofable forwarding headers by default', async () => {
    delete process.env.TRUSTED_PROXY_IP_HEADER;
    const mod = await import('@/lib/rate-limit');
    const request = { headers: new Headers({ 'x-forwarded-for': '203.0.113.77' }) } as any;
    expect(mod.getClientIP(request)).toBe('unknown-client');
  });

  it('uses an explicitly trusted, proxy-overwritten header', async () => {
    process.env.TRUSTED_PROXY_IP_HEADER = 'cf-connecting-ip';
    const mod = await import('@/lib/rate-limit');
    const request = { headers: new Headers({ 'cf-connecting-ip': '2001:db8::1' }) } as any;
    expect(mod.getClientIP(request)).toBe('2001:db8::1');
  });

  it('creates an opaque stable HMAC identity instead of storing a network prefix', async () => {
    process.env.ANONYMOUS_ID_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.TRUSTED_PROXY_IP_HEADER = 'x-real-ip';
    const mod = await import('@/lib/rate-limit');
    const request = { headers: new Headers({ 'x-real-ip': '198.51.100.42', 'user-agent': 'test-agent' }) } as any;
    const id = mod.createAnonymousClientId(request);
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).not.toContain('198.51.100');
    expect(mod.createAnonymousClientId(request)).toBe(id);
  });
});
