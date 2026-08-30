'use client';

import { useState } from 'react';
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
};

export function AdminSettingsManager({ initialSettings }: { initialSettings: AdminSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  function patch(partial: Partial<AdminSettings>) {
    setSettings((current) => ({ ...current, ...partial }));
  }

  async function save() {
    if (!settings.siteName.trim()) return setMessage({ kind: 'error', text: '站点名称不能为空' });
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: settings.siteName.trim(),
          siteDescription: settings.siteDescription?.trim() || null,
          darkModeDefault: settings.darkModeDefault,
          customCss: settings.customCss || null,
          icpNumber: settings.icpNumber?.trim() || null,
          enableComments: settings.enableComments,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      setMessage({ kind: 'success', text: '设置已保存' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">站点设置</h1>
          <p className="mt-2 text-text-secondary">站点信息与评论策略等全局配置。</p>
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
