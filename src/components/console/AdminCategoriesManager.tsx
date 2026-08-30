'use client';

import { useState } from 'react';
import { FolderPlus, Link2, PencilLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input, Textarea } from '@/components/ui/Input';

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  postCount: number;
};

type FormState = { id: string | null; name: string; slug: string; description: string; sortOrder: number };
const emptyForm: FormState = { id: null, name: '', slug: '', description: '', sortOrder: 0 };

export function AdminCategoriesManager({ initialCategories }: { initialCategories: AdminCategory[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function refresh() {
    const response = await fetch('/api/admin/categories', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setCategories(data.categories ?? []);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setFormOpen(true);
    setMessage(null);
  }

  function openEdit(category: AdminCategory) {
    setForm({ id: category.id, name: category.name, slug: category.slug, description: category.description ?? '', sortOrder: category.sortOrder });
    setFormOpen(true);
    setMessage(null);
  }

  async function save() {
    if (!form.name.trim()) return setMessage({ kind: 'error', text: '请填写分类名称' });
    setSaving(true);
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : { description: null }),
      sortOrder: form.sortOrder,
    };
    try {
      const response = form.id
        ? await fetch(`/api/admin/categories/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      await refresh();
      setFormOpen(false);
      setMessage({ kind: 'success', text: form.id ? '分类已更新' : '分类已创建' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setDeleting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/categories/${pendingDelete.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      await refresh();
      setMessage({ kind: 'success', text: `分类已删除${data.detachedPosts ? `，${data.detachedPosts} 篇文章已转为未分类` : ''}` });
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
          <h1 className="text-3xl font-bold text-text-primary">分类管理</h1>
          <p className="mt-2 text-text-secondary">维护文章分类目录，文章归属单分类，删除分类后文章自动转为未分类。</p>
        </div>
        <Button onClick={openCreate}><FolderPlus className="mr-2 h-4 w-4" />新建分类</Button>
      </div>

      {message && (
        <p role="status" className={`mb-4 rounded-button px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-700'}`}>{message.text}</p>
      )}

      {formOpen && (
        <Card className="mb-6">
          <CardHeader><h2 className="font-semibold text-text-primary">{form.id ? '编辑分类' : '新建分类'}</h2></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input label="分类名称" value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：后端技术" />
            <Input label="别名（slug，选填）" value={form.slug} maxLength={100} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="留空自动生成，如 backend" helperText="访问路径 /categories/{slug}" />
            <Textarea label="描述（选填）" value={form.description} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="分类用途说明" />
            <Input label="排序（数字越小越靠前）" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
            <div className="flex gap-2 md:col-span-2">
              <Button type="button" loading={saving} onClick={save}>{form.id ? '保存修改' : '创建分类'}</Button>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold text-text-primary">分类列表</h2></CardHeader>
        <CardContent className="space-y-4">
          {categories.length ? categories.map((category) => (
            <article key={category.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text-primary">{category.name}</p>
                  <span className="rounded-full bg-background-hover px-2 py-0.5 text-xs text-text-secondary">{category.postCount} 篇文章</span>
                  <span className="flex items-center gap-1 rounded-full bg-background-hover px-2 py-0.5 text-xs text-text-muted"><Link2 className="h-3 w-3" />/categories/{category.slug}</span>
                </div>
                {category.description && <p className="mt-1 truncate text-sm text-text-muted">{category.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(category)}><PencilLine className="mr-2 h-4 w-4" />编辑</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendingDelete(category)}><Trash2 className="mr-2 h-4 w-4" />删除</Button>
              </div>
            </article>
          )) : (
            <div className="py-10 text-center text-text-muted">还没有分类，点击右上角「新建分类」开始组织文章。</div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除分类"
        description={pendingDelete ? `确定删除分类「${pendingDelete.name}」吗？该分类下 ${pendingDelete.postCount} 篇文章将转为「未分类」。` : undefined}
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
