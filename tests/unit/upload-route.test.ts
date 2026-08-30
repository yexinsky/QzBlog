/** @jest-environment jsdom */

const getServerSession = jest.fn();
const rateLimitCheck = jest.fn();
const handleImageUpload = jest.fn();
const jsonResponse = (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
  body,
  status: init?.status ?? 200,
  headers: init?.headers,
});

jest.mock('next-auth', () => ({ getServerSession: (...args: unknown[]) => getServerSession(...args) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => jsonResponse(body, init) },
}));
jest.mock('@/lib/rate-limit', () => ({
  globalRatelimit: {},
  withRatelimit: () => () => rateLimitCheck(),
}));
jest.mock('@/lib/storage', () => ({
  handleImageUpload: (...args: unknown[]) => handleImageUpload(...args),
}));

import { POST } from '@/app/api/upload/route';

type FakeRequest = {
  headers: { get: (name: string) => string | null };
  formData: () => Promise<FormData>;
};

function request(): FakeRequest {
  return {
    headers: { get: () => null },
    formData: jest.fn(async () => new FormData()),
  };
}

describe('upload route authorization', () => {
  beforeEach(() => {
    rateLimitCheck.mockResolvedValue({ success: true });
    handleImageUpload.mockResolvedValue({ success: true, url: 'https://cdn.example/a.webp' });
  });

  test('returns 401 for anonymous requests before rate limiting', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await POST(request() as never);
    expect(response.status).toBe(401);
    expect(rateLimitCheck).not.toHaveBeenCalled();
  });

  test('returns 403 for authenticated non-admin users before rate limiting', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1', role: 'user' } });
    const response = await POST(request() as never);
    expect(response.status).toBe(403);
    expect(rateLimitCheck).not.toHaveBeenCalled();
  });

  test('rate limits authenticated administrators before parsing a form', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    rateLimitCheck.mockResolvedValue({ success: false, response: jsonResponse({ error: 'Too many requests' }, { status: 429 }) });
    const fakeRequest = request();
    const response = await POST(fakeRequest as never);
    expect(response.status).toBe(429);
    expect(rateLimitCheck).toHaveBeenCalledTimes(1);
    expect(fakeRequest.formData).not.toHaveBeenCalled();
    expect(handleImageUpload).not.toHaveBeenCalled();
  });
});
