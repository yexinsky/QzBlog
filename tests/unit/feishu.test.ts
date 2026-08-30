import { sendFeishuCard } from '@/lib/notify/feishu';

describe('feishu webhook card', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
    fetchMock.mockReset();
  });

  test('posts an interactive card without signing when secret absent', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ code: 0 }) });
    const result = await sendFeishuCard('https://open.feishu.cn/hook/x', null, {
      title: '标题',
      summary: '摘要',
      timestamp: '2026-08-30 12:00:00',
    });
    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.msg_type).toBe('interactive');
    expect(body.card.header.title.content).toBe('标题');
    expect(body.sign).toBeUndefined();
  });

  test('includes timestamp and sign when secret provided', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ code: 0 }) });
    await sendFeishuCard('https://open.feishu.cn/hook/x', 'my-secret', {
      title: 't',
      summary: 's',
      timestamp: 'ts',
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.sign).toBe('string');
    expect(body.sign.length).toBeGreaterThan(0);
  });

  test('returns failure on non-zero feishu code', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ code: 19021, msg: 'sign match fail' }) });
    const result = await sendFeishuCard('https://open.feishu.cn/hook/x', 'secret', { title: 't', summary: 's', timestamp: 'ts' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('sign match fail');
  });

  test('returns failure on network error', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await sendFeishuCard('https://open.feishu.cn/hook/x', null, { title: 't', summary: 's', timestamp: 'ts' });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('network down');
  });
});
