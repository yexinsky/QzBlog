import { createHmac } from 'crypto';

export type FeishuEvent = 'comment.pending' | 'post.published' | 'backup.completed' | 'backup.failed';

export interface FeishuCardPayload {
  title: string;
  summary: string;
  timestamp: string;
  consoleUrl?: string;
}

/**
 * 发送飞书群自定义机器人消息卡片（PRD 11.9）。
 * 签名算法：timestamp + '\n' + secret 作为 HMAC-SHA256 的 key，对空串签名后 base64。
 */
export async function sendFeishuCard(
  webhookUrl: string,
  secret: string | null,
  payload: FeishuCardPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: payload.title },
          template: 'orange',
        },
        elements: [
          {
            tag: 'div',
            text: { tag: 'lark_md', content: payload.summary },
          },
          {
            tag: 'note',
            elements: [{ tag: 'plain_text', content: payload.timestamp }],
          },
          ...(payload.consoleUrl
            ? [{
              tag: 'action',
              actions: [{
                tag: 'button',
                text: { tag: 'plain_text', content: '打开后台' },
                type: 'primary',
                url: payload.consoleUrl,
              }],
            }]
            : []),
        ],
      },
    };

    if (secret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const sign = createHmac('sha256', `${timestamp}\n${secret}`).update('').digest('base64');
      body.timestamp = timestamp;
      body.sign = sign;
    }

    // jsdom/旧运行时可能没有 AbortSignal.timeout，退化为手动 AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    const data = (await response.json().catch(() => null)) as { code?: number; msg?: string } | null;
    if (!response.ok || (data && typeof data.code === 'number' && data.code !== 0)) {
      return { ok: false, error: data?.msg || `feishu webhook HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'feishu request failed' };
  }
}
