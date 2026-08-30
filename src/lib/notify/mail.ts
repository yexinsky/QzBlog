import nodemailer, { type Transporter } from 'nodemailer';
import type { SiteSettings } from '@/lib/settings';
import { decryptSecret } from '@/lib/crypto';

export type MailEvent = 'comment.pending' | 'comment.reply' | 'post.published' | 'backup.completed' | 'backup.failed';

export interface CommentMailPayload {
  authorName: string;
  targetLabel: string;
  contentSummary: string;
  consoleUrl: string;
}

function buildTransport(settings: SiteSettings): Transporter | null {
  const host = settings.smtpHost;
  const user = settings.smtpUser;
  const pass = decryptSecret(settings.smtpPass);
  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: settings.smtpPort ?? 465,
    secure: (settings.smtpPort ?? 465) === 465,
    auth: { user, pass },
  });
}

/** 同事件 1 分钟内聚合限频，防邮件轰炸（PRD 11.8） */
export const lastSentAt = new Map<string, number>();
const AGGREGATION_WINDOW_MS = 60_000;

export function shouldAggregate(eventKey: string, now = Date.now()): boolean {
  const last = lastSentAt.get(eventKey);
  if (last !== undefined && now - last < AGGREGATION_WINDOW_MS) return true;
  lastSentAt.set(eventKey, now);
  return false;
}

export function renderCommentMailHtml(event: MailEvent, payload: CommentMailPayload): string {
  const title = event === 'comment.reply' ? '你的内容有新回复' : '有新评论待审核';
  return [
    `<h2 style="margin:0 0 12px">${title}</h2>`,
    `<p><strong>${escapeHtml(payload.authorName)}</strong> 评论了 ${escapeHtml(payload.targetLabel)}：</p>`,
    `<blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #D36F2B;background:#F5F1EA">${escapeHtml(payload.contentSummary)}</blockquote>`,
    `<p style="margin-top:16px"><a href="${payload.consoleUrl}">前往后台处理</a></p>`,
  ].join('');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 发送评论通知邮件。失败记录日志并重试一次（PRD 11.8）。
 */
export async function sendCommentNotification(
  settings: SiteSettings,
  event: MailEvent,
  payload: CommentMailPayload
): Promise<{ ok: boolean; error?: string }> {
  const transporter = buildTransport(settings);
  const recipient = settings.smtpFrom || settings.smtpUser;
  if (!transporter || !recipient) {
    console.warn('SMTP notification skipped: transport or recipient not configured');
    return { ok: false, error: 'SMTP not configured' };
  }

  const mail = {
    from: `"${settings.smtpDisplayName || settings.siteName}" <${settings.smtpFrom || settings.smtpUser}>`,
    to: recipient,
    subject: event === 'comment.reply' ? `【${settings.siteName}】评论回复通知` : `【${settings.siteName}】新评论待审核`,
    html: renderCommentMailHtml(event, payload),
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await transporter.sendMail(mail);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'mail send failed';
      console.error(`SMTP send failed (attempt ${attempt}/2):`, message);
      if (attempt === 2) return { ok: false, error: message };
    }
  }
  return { ok: false, error: 'unreachable' };
}

/** 设置页「发送测试邮件」按钮（PRD 11.8） */
export async function sendTestMail(settings: SiteSettings, recipientOverride?: string): Promise<{ ok: boolean; error?: string }> {
  const transporter = buildTransport(settings);
  const recipient = recipientOverride || settings.smtpFrom || settings.smtpUser;
  if (!transporter || !recipient) {
    return { ok: false, error: 'SMTP 未配置完整（主机、用户名、授权码、发信地址）' };
  }
  try {
    await transporter.sendMail({
      from: `"${settings.smtpDisplayName || settings.siteName}" <${settings.smtpFrom || settings.smtpUser}>`,
      to: recipient,
      subject: `【${settings.siteName}】SMTP 配置测试邮件`,
      html: '<p>这是一封测试邮件，说明你的 SMTP 配置已生效。</p>',
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '发送失败' };
  }
}
