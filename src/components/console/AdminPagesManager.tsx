'use client';

import { useEffect, useState } from 'react';
import { FileText, PencilLine, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, Textarea } from '@/components/ui/Input';
import { MarkdownEditorWithToolbar } from '@/components/article/MarkdownEditor';

type AdminPage = {
  id: string;
  title: string;
  slug: string;
  contentMd?: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
};

const EMPTY_FORM: { id: string | null; title: string; slug: string; contentMd: string; visible: boolean } = { id: null, title: '', slug: '', contentMd: '', visible: true };

export function AdminPagesManager({ initialPages }: { initialPages: AdminPage[] }) {
  const [pages, setPages] = useState(initialPages);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminPage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function refresh() {
    const response = await fetch('/api/admin/pages', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setPages(data.pages ?? []);
    }
  }

  function openEdit(page: AdminPage) {
    setForm({ id: page.id, title: page.title, slug: page.slug, contentMd: page.contentMd ?? '', visible: page.visible });
    setFormOpen(true);
    setMessage(null);
  }

  useEffect(() => {
    if (!formOpen || !form.contentMd.trim()) { setPreviewHtml(''); return; }
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/markdown/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentMd: form.contentMd }) });
        const data = await response.json();
        if (response.ok) setPreviewHtml(data.html ?? '');
      } catch { /* 预览失败保持现状 */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [formOpen, form.contentMd]);

  async function save() {
    if (!form.title.trim()) return setMessage({ kind: 'error', text: '请填写标题' });
    if (!form.slug.trim()) return setMessage({ kind: 'error', text: '请填写 slug' });
    if (!form.contentMd.trim()) return setMessage({ kind: 'error', text: '请填写内容' });
    setSaving(true);
    setMessage(null);
    try {
      const response = form.id
        ? await fetch(`/api/admin/pages/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title.trim(), contentMd: form.contentMd, visible: form.visible }) })
        : await fetch('/api/admin/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title.trim(), slug: form.slug.trim(), contentMd: form.contentMd, visible: form.visible }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      setFormOpen(false);
      await refresh();
      setMessage({ kind: 'success', text: form.id ? '页面已更新' : '页面已创建' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/pages/${pendingDelete.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      await refresh();
      setMessage({ kind: 'success', text: '页面已删除' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '删除失败' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">页面管理</h1>
          <p className="mt-2 text-text-secondary">「关于」等固定单页内容后台可编辑，无需改代码发版。</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setFormOpen(true); setMessage(null); }}><Plus className="mr-2 h-4 w-4" />新建页面</Button>
      </div>

      {message && (
        <p role="status" className={`mb-4 rounded-button px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-700'}`}>{message.text}</p>
      )}

      {formOpen && (
        <Card className="mb-6">
          <CardHeader><h2 className="font-semibold text-text-primary">{form.id ? '编辑页面' : '新建页面'}</h2></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="标题" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="如：关于我" />
              <Input label="slug" value={form.slug} maxLength={200} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="如 about（固定路由绑定）" helperText="about 将渲染在 /about 页" disabled={Boolean(form.id)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">内容（Markdown）</label>
              <MarkdownEditorWithToolbar value={form.contentMd} onChange={(value) => setForm({ ...form, contentMd: value })} minHeight="360px" />
            </div>
            {previewHtml && <div className="rounded-button border border-border p-4"><article className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewHtml }} /></div>}
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} />
              对外可见
            </label>
            <div className="flex gap-2">
              <Button type="button" loading={saving} onClick={save}>{form.id ? '保存修改' : '创建页面'}</Button>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold text-text-primary">页面列表（{pages.length}）</h2></CardHeader>
        <CardContent className="space-y-4">
          {pages.length ? pages.map((page) => (
            <article key={page.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text-primary">{page.title}</p>
                  <span className="rounded-full bg-background-hover px-2 py-0.5 text-xs text-text-secondary">/{page.slug}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${page.visible ? 'bg-green-100 text-green-800' : 'bg-background-hover text-text-muted'}`}>{page.visible ? '可见' : '隐藏'}</span>
                </div>
                <p className="mt-1 text-xs text-text-muted">更新于 {new Date(page.updatedAt).toLocaleString('zh-CN')}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void openEdit(page)}><PencilLine className="mr-2 h-4 w-4" />编辑</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendingDelete(page)}><Trash2 className="mr-2 h-4 w-4" />删除</Button>
              </div>
            </article>
          )) : (
            <div className="py-10 text-center text-text-muted"><FileText className="mx-auto mb-2 h-6 w-6" />暂无自定义页面</div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除页面"
        description={pendingDelete ? `确定删除页面「${pendingDelete.title}」吗？前台对应内容将不再展示。` : undefined}
        confirmText="确认删除"
        cancelText="取消"
        tone="danger"
        loading={deleting}
        onConfirm={remove}
        onCancel={() => { if (!deleting) setPendingDelete(null) }}
      />
    </div>
  );
}
