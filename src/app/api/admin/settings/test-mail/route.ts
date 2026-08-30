import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-auth';
import { getSiteSettings } from '@/lib/settings';
import { sendTestMail } from '@/lib/notify/mail';

const testMailSchema = z.object({
  recipient: z.string().trim().email('请输入有效的收件邮箱').optional(),
}).strict();

/** POST /api/admin/settings/test-mail — SMTP「发送测试邮件」（PRD 11.8） */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('response' in auth) return auth.response;

    const parsed = testMailSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await getSiteSettings();
    const result = await sendTestMail(settings, parsed.data.recipient);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? '发送失败' }, { status: 502 });
    }
    return NextResponse.json({ success: true, message: '测试邮件已发送，请查收' });
  } catch (error) {
    console.error('Failed to send test mail:', error);
    return NextResponse.json({ error: 'Failed to send test mail' }, { status: 500 });
  }
}
