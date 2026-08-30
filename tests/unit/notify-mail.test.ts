import { shouldAggregate, renderCommentMailHtml, sendTestMail, lastSentAt } from '@/lib/notify/mail';
import { encryptSecret } from '@/lib/crypto';
import type { SiteSettings } from '@/lib/settings';

const sendMail = jest.fn();
jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: () => ({ sendMail: (...args: unknown[]) => sendMail(...args) }) },
}));

function buildSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  const now = new Date();
  return {
    id: 's1',
    siteName: 'QzBlog',
    siteDescription: null,
    siteLogo: null,
    siteFavicon: null,
    avatarUrl: null,
    bio: null,
    darkModeDefault: false,
    icpNumber: null,
    customCss: null,
    seoKeywords: null,
    blockSearchEngine: false,
    enableComments: true,
    smtpEnabled: true,
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    smtpUser: 'postmaster@example.com',
    smtpPass: encryptSecret('real-encrypted-secret'),
    smtpFrom: 'blog@example.com',
    smtpDisplayName: 'QzBlog',
    feishuEnabled: false,
    feishuWebhookUrl: null,
    feishuSecret: null,
    feishuEvents: null,
    smtpEvents: null,
    backupKeepCount: 5,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('mail notification helpers', () => {
  beforeEach(() => {
    lastSentAt.clear();
    sendMail.mockReset();
    sendMail.mockResolvedValue({ messageId: 'test' });
  });

  test('aggregates same event within one minute', () => {
    expect(shouldAggregate('mail:comment.pending')).toBe(false);
    expect(shouldAggregate('mail:comment.pending')).toBe(true);
    expect(shouldAggregate('mail:comment.reply')).toBe(false);
  });

  test('renders comment mail html with escaped content', () => {
    const html = renderCommentMailHtml('comment.pending', {
      authorName: '<script>x</script>',
      targetLabel: '文章《Go 入门》',
      contentSummary: '写得好',
      consoleUrl: 'https://example.com/console',
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('文章《Go 入门》');
    expect(html).toContain('https://example.com/console');
  });

  test('sendTestMail reports missing config clearly', async () => {
    const result = await sendTestMail(buildSettings({ smtpHost: null }));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('SMTP 未配置');
  });

  test('sendTestMail succeeds with full config', async () => {
    const result = await sendTestMail(buildSettings());
    expect(result.ok).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
