'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input, Textarea } from '@/components/ui/Input';

export type AdminSettings = {
  siteName: string;
  siteDescription: string | null;
  darkModeDefault: boolean;
  customCss: string | null;
  icpNumber: string | null;
  enableComments: boolean;
  // SEO（PRD 11.10）
  seoKeywords: string | null;
  blockSearchEngine: boolean;
  // SMTP（PRD 11.8）
  smtpEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassSet: boolean;
  smtpFrom: string | null;
  smtpDisplayName: string | null;
  // 飞书（PRD 11.9）
  feishuEnabled: boolean;
  feishuWebhookUrl: string | null;
  feishuSecretSet: boolean;
  feishuEvents: string[];
  // 备份（PRD 11.11）
  backupKeepCount: number;
};

const FEISHU_EVENT_OPTIONS = [
  { value: 'comment.pending', label: '新评论待审核' },
  { value: 'post.published', label: '文章发布成功' },
  { value: 'backup.completed', label: '备份完成' },
  { value: 'backup.failed', label: '备份失败' },
];

export function AdminSettingsManager({ initialSettings }: { initialSettings: AdminSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [smtpPassInput, setSmtpPassInput] = useState('');
  const [feishuSecretInput, setFeishuSecretInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [testingMail, setTestingMail] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  function patch(partial: Partial<AdminSettings>) {
    setSettings((current) => ({ ...current, ...partial }));
  }

  function buildPayload() {
    return {
      siteName: settings.siteName.trim(),
      siteDescription: settings.siteDescription?.trim() || null,
      darkModeDefault: settings.darkModeDefault,
      customCss: settings.customCss || null,
      icpNumber: settings.icpNumber?.trim() || null,
      enableComments: settings.enableComments,
      seoKeywords: settings.seoKeywords?.trim() || null,
      blockSearchEngine: settings.blockSearchEngine,
      smtpEnabled: settings.smtpEnabled,
      smtpHost: settings.smtpHost?.trim() || null,
      smtpPort: settings.smtpPort || null,
      smtpUser: settings.smtpUser?.trim() || null,
      // 密钥：null = 不修改；'' = 清除；有值 = 更新
      smtpPass: smtpPassInput ? smtpPassInput : settings.smtpPassSet ? null : '',
      smtpFrom: settings.smtpFrom?.trim() || null,
      smtpDisplayName: settings.smtpDisplayName?.trim() || null,
      feishuEnabled: settings.feishuEnabled,
      feishuWebhookUrl: settings.feishuWebhookUrl?.trim() || null,
      feishuSecret: feishuSecretInput ? feishuSecretInput : settings.feishuSecretSet ? null : '',
      feishuEvents: settings.feishuEvents,
      backupKeepCount: settings.backupKeepCount || 5,
    };
  }

  async function save() {
    if (!settings.siteName.trim()) return setMessage({ kind: 'error', text: '站点名称不能为空' });
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      setSmtpPassInput('');
      setFeishuSecretInput('');
      setMessage({ kind: 'success', text: '设置已保存' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  async function testMail() {
    setTestingMail(true);
    setMessage(null);
    try {
      // 先保存当前 SMTP 配置再测试
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const response = await fetch('/api/admin/settings/test-mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '发送失败');
      setMessage({ kind: 'success', text: data.message || '测试邮件已发送' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '发送失败' });
    } finally {
      setTestingMail(false);
    }
  }

  function toggleFeishuEvent(value: string) {
    patch({
      feishuEvents: settings.feishuEvents.includes(value)
        ? settings.feishuEvents.filter((item) => item !== value)
        : [...settings.feishuEvents, value],
    });
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">站点设置</h1>
          <p className="mt-2 text-text-secondary">站点信息、SEO、评论策略与通知渠道等全局配置。</p>
        </div>
        <Button onClick={save} loading={saving}>保存设置</Button>
      </div>

      {message && (
        <p role="status" className={`mb-4 rounded-button px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-700'}`}>{message.text}</p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><h2 className="font-semibold text-text-primary">站点信息</h2></CardHeader>
          <CardContent className="space-y-4">
            <Input label="站点名称" value={settings.siteName} maxLength={100} onChange={(e) => patch({ siteName: e.target.value })} />
            <Textarea label="站点描述（SEO）" value={settings.siteDescription ?? ''} maxLength={500} onChange={(e) => patch({ siteDescription: e.target.value })} placeholder="展示在搜索引擎与社交分享中的站点简介" />
            <Input label="ICP 备案号（选填）" value={settings.icpNumber ?? ''} maxLength={100} onChange={(e) => patch({ icpNumber: e.target.value })} placeholder="如：京ICP备XXXXXXXX号" />
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input type="checkbox" checked={settings.darkModeDefault} onChange={(e) => patch({ darkModeDefault: e.target.checked })} />
              默认启用暗色模式
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-text-primary">SEO 设置（v1.1）</h2></CardHeader>
          <CardContent className="space-y-4">
            <Input label="站点关键词（逗号分隔）" value={settings.seoKeywords ?? ''} maxLength={500} onChange={(e) => patch({ seoKeywords: e.target.value })} placeholder="如：技术博客, Go, 前端工程化" helperText="输出至首页 meta keywords 与 Open Graph" />
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input type="checkbox" className="mt-1" checked={settings.blockSearchEngine} onChange={(e) => patch({ blockSearchEngine: e.target.checked })} />
              <span>
                <span className="font-medium">屏蔽搜索引擎</span>
                <span className="mt-1 block text-text-secondary">开启后 robots.txt 全站 Disallow，页面添加 noindex。适用于开发或临时闭站场景。</span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-text-primary">评论策略（v1.1）</h2></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input type="checkbox" className="mt-1" checked={settings.enableComments} onChange={(e) => patch({ enableComments: e.target.checked })} />
              <span>
                <span className="font-medium">启用站点评论</span>
                <span className="mt-1 block text-text-secondary">关闭后前台所有评论区隐藏、评论接口返回 403；与文章级「允许评论」开关叠加生效，已发表评论不受影响。</span>
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">SMTP 邮件通知（v1.1）</h2>
            <Button type="button" size="sm" variant="secondary" loading={testingMail} onClick={testMail}><Send className="mr-1 h-3.5 w-3.5" />发送测试邮件</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input type="checkbox" checked={settings.smtpEnabled} onChange={(e) => patch({ smtpEnabled: e.target.checked })} />
              启用 SMTP 邮件通知
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="SMTP 服务器" value={settings.smtpHost ?? ''} onChange={(e) => patch({ smtpHost: e.target.value })} placeholder="smtp.example.com" />
              <Input label="端口" type="number" value={settings.smtpPort ?? ''} onChange={(e) => patch({ smtpPort: Number(e.target.value) || null })} placeholder="465" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="用户名" value={settings.smtpUser ?? ''} onChange={(e) => patch({ smtpUser: e.target.value })} placeholder="postmaster@example.com" />
              <Input label={settings.smtpPassSet ? '授权码（已设置，留空不修改）' : '授权码'} type="password" value={smtpPassInput} onChange={(e) => setSmtpPassInput(e.target.value)} placeholder={settings.smtpPassSet ? '••••••••' : 'SMTP 授权码'} autoComplete="new-password" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="发信地址" type="email" value={settings.smtpFrom ?? ''} onChange={(e) => patch({ smtpFrom: e.target.value })} placeholder="blog@example.com" />
              <Input label="发件人显示名称" value={settings.smtpDisplayName ?? ''} onChange={(e) => patch({ smtpDisplayName: e.target.value })} placeholder="QzBlog" />
            </div>
            <p className="text-xs text-text-muted">通知触发：新评论待审核、评论被回复。收件人为发信地址。发送失败自动重试，同事件 1 分钟内聚合限频。</p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><h2 className="font-semibold text-text-primary">飞书群通知（v1.1）</h2></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input type="checkbox" checked={settings.feishuEnabled} onChange={(e) => patch({ feishuEnabled: e.target.checked })} />
              启用飞书群通知（与 SMTP 相互独立，可分别开关）
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Webhook 地址" value={settings.feishuWebhookUrl ?? ''} onChange={(e) => patch({ feishuWebhookUrl: e.target.value })} placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx" />
              <Input label={settings.feishuSecretSet ? '签名密钥（已设置，留空不修改）' : '签名密钥（可选）'} type="password" value={feishuSecretInput} onChange={(e) => setFeishuSecretInput(e.target.value)} placeholder={settings.feishuSecretSet ? '••••••••' : '机器人安全设置中的签名密钥'} autoComplete="new-password" />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">订阅事件</legend>
              <div className="flex flex-wrap gap-2">
                {FEISHU_EVENT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm">
                    <input type="checkbox" checked={settings.feishuEvents.includes(option.value)} onChange={() => toggleFeishuEvent(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-text-muted">消息以飞书卡片推送到群内，包含事件标题、摘要、时间与后台跳转链接；推送失败不阻塞主流程并自动记录日志。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-text-primary">备份与恢复（v1.1）</h2></CardHeader>
          <CardContent className="space-y-4">
            <Input label="备份最大保留份数" type="number" min={1} max={100} value={settings.backupKeepCount} onChange={(e) => patch({ backupKeepCount: Number(e.target.value) || 5 })} helperText="超出份数时滚动淘汰最旧的备份（默认 5）" />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><h2 className="font-semibold text-text-primary">自定义 CSS（高级）</h2></CardHeader>
          <CardContent>
            <Textarea value={settings.customCss ?? ''} onChange={(e) => patch({ customCss: e.target.value })} rows={6} placeholder="注入到全站的自定义样式，仅建议熟悉 CSS 的用户使用" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
