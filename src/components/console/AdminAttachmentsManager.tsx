'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, FolderPlus, Grid3X3, ImagePlus, List, PencilLine, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

type AdminAttachment = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  groupId: string | null;
  storage: string;
  createdAt: string;
  group?: { id: string; displayName: string } | null;
};

type AdminGroup = { id: string; displayName: string; sortOrder: number; attachmentCount: number };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const PAGE_SIZE = 24;

export function AdminAttachmentsManager() {
  const [attachments, setAttachments] = useState<AdminAttachment[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [groupFilter, setGroupFilter] = useState<'all' | 'ungrouped' | string>('all');
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; referenced?: Record<string, string[]> } | null>(null);  const [deleting, setDeleting] = useState(false);
  const [groupForm, setGroupForm] = useState<{ id: string | null; displayName: string } | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [uploadGroupId, setUploadGroupId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAttachments = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (groupFilter === 'ungrouped') params.set('groupId', 'ungrouped');
      else if (groupFilter !== 'all') params.set('groupId', groupFilter);
      if (keyword.trim()) params.set('keyword', keyword.trim());
      // groupId=ungrouped 为前端语义，后端按无 group_id 过滤
      if (groupFilter === 'ungrouped') params.set('ungrouped', '1');
      const response = await fetch(`/api/admin/attachments?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载失败');
      setAttachments(data.attachments ?? []);
      setPagination({ page: data.pagination.page, total: data.pagination.total, totalPages: data.pagination.totalPages });
      setSelected(new Set());
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '加载失败' });
    } finally {
      setLoading(false);
    }
  }, [groupFilter, keyword]);

  const loadGroups = useCallback(async () => {
    const response = await fetch('/api/admin/attachment-groups', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setGroups(data.groups ?? []);
    }
  }, []);

  useEffect(() => { void loadGroups(); }, [loadGroups]);
  useEffect(() => { const timer = setTimeout(() => void loadAttachments(1), keyword ? 300 : 0); return () => clearTimeout(timer); }, [loadAttachments, keyword]);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      files.slice(0, 9).forEach((file) => form.append('files', file));
      if (uploadGroupId) form.append('groupId', uploadGroupId);
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '上传失败');
      setMessage({ kind: 'success', text: `已上传 ${data.attachments?.length ?? files.length} 个附件` });
      await Promise.all([loadAttachments(1), loadGroups()]);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '上传失败' });
    } finally {
      setUploading(false);
    }
  }

  // v1.1（PRD 11.3）：删除前先做引用检查，命中时在确认弹窗中二次提示
  async function requestBatchDelete(ids: string[]) {
    setMessage(null);
    let referenced: Record<string, string[]> = {};
    try {
      const response = await fetch('/api/admin/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, check: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '引用检查失败');
      referenced = data.referenced ?? {};
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '引用检查失败' });
      return;
    }
    setPendingDelete({ ids, referenced });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/attachments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pendingDelete.ids }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      setMessage({ kind: 'success', text: `已删除 ${data.deleted} 个附件${data.deletedFiles ? `（含 ${data.deletedFiles} 个存储文件）` : ''}` });
      await Promise.all([loadAttachments(pagination.page), loadGroups()]);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '删除失败' });
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  async function saveGroup() {
    if (!groupForm?.displayName.trim()) return setMessage({ kind: 'error', text: '请填写分组名称' });
    setSavingGroup(true);
    try {
      const response = groupForm.id
        ? await fetch(`/api/admin/attachment-groups/${groupForm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: groupForm.displayName.trim() }) })
        : await fetch('/api/admin/attachment-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: groupForm.displayName.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      setGroupForm(null);
      await loadGroups();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSavingGroup(false);
    }
  }

  async function deleteGroup(group: AdminGroup) {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/attachment-groups/${group.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      if (groupFilter === group.id) setGroupFilter('all');
      await loadGroups();
      setMessage({ kind: 'success', text: '分组已删除，组内附件已归入未分组' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '删除失败' });
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">附件管理</h1>
          <p className="mt-2 text-text-secondary">统一管理文章、动态与封面的图片附件，支持分组与批量操作。</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={uploadGroupId} onChange={(e) => setUploadGroupId(e.target.value)} className="rounded-button border border-border bg-background-base px-3 py-2 text-sm" aria-label="上传到分组">
            <option value="">上传到：未分组</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.displayName}</option>)}
          </select>
          <Button onClick={() => fileInputRef.current?.click()} loading={uploading}><ImagePlus className="mr-2 h-4 w-4" />上传图片</Button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) void uploadFiles(files); e.target.value = ''; }} />
        </div>
      </div>

      {message && (
        <p role="status" className={`mb-4 rounded-button px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-700'}`}>{message.text}</p>
      )}

      <div
        className={cn('rounded-card border-2 border-dashed p-4 text-center text-sm transition-colors', dragActive ? 'border-brand-orange bg-brand-orange/5' : 'border-border text-text-muted')}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); const files = Array.from(e.dataTransfer.files ?? []); if (files.length) void uploadFiles(files); }}
      >
        <UploadCloud className="mx-auto mb-1 h-5 w-5" />
        拖拽图片到此处上传（支持多选，单张 ≤ 5MB）
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">分组</h2>
            <button type="button" onClick={() => setGroupForm({ id: null, displayName: '' })} className="text-text-secondary hover:text-brand-orange" aria-label="新建分组"><FolderPlus className="h-4 w-4" /></button>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { id: 'all', label: '全部附件', count: null },
              { id: 'ungrouped', label: '未分组', count: null },
              ...groups.map((group) => ({ id: group.id, label: group.displayName, count: group.attachmentCount })),
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGroupFilter(item.id)}
                className={cn('flex w-full items-center justify-between rounded-button px-3 py-2 text-sm transition-colors', groupFilter === item.id ? 'bg-brand-orange/10 text-brand-orange' : 'text-text-secondary hover:bg-background-hover')}
              >
                <span className="flex items-center gap-2"><PencilLine className="h-3.5 w-3.5 opacity-0" />{item.label}</span>
                {item.count !== null && <span className="text-xs text-text-muted">{item.count}</span>}
              </button>
            ))}
            {groups.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between px-3 text-xs text-text-muted">
                    <button type="button" className="hover:text-brand-orange" onClick={() => setGroupForm({ id: group.id, displayName: group.displayName })}>重命名</button>
                    <button type="button" className="hover:text-red-500" onClick={() => void deleteGroup(group)}>删除分组</button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-[200px] flex-1"><Input label="搜索附件" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="文件名" /></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setView('grid')} className={cn('rounded-button p-2', view === 'grid' ? 'bg-brand-orange/10 text-brand-orange' : 'text-text-secondary')} aria-label="网格视图"><Grid3X3 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setView('list')} className={cn('rounded-button p-2', view === 'list' ? 'bg-brand-orange/10 text-brand-orange' : 'text-text-secondary')} aria-label="列表视图"><List className="h-4 w-4" /></button>
              </div>
              {selected.size > 0 && (
                <Button variant="ghost" size="sm" onClick={() => requestBatchDelete([...selected])}><Trash2 className="mr-2 h-4 w-4" />删除所选（{selected.size}）</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-text-muted">加载中…</div>
            ) : attachments.length === 0 ? (
              <div className="py-10 text-center text-text-muted">还没有附件，拖拽或点击「上传图片」开始。</div>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {attachments.map((attachment) => (
                  <figure key={attachment.id} className={cn('group relative overflow-hidden rounded-card border bg-background-base', selected.has(attachment.id) ? 'border-brand-orange ring-1 ring-brand-orange' : 'border-border')}>
                    <button type="button" className="absolute left-2 top-2 z-10" onClick={() => toggleSelected(attachment.id)} aria-label={selected.has(attachment.id) ? '取消选择' : '选择'}>
                      {selected.has(attachment.id) ? <CheckCircle2 className="h-5 w-5 text-brand-orange" /> : <Circle className="h-5 w-5 text-white/80 drop-shadow" />}
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.url} alt={attachment.originalName} loading="lazy" className="aspect-square w-full object-cover" />
                    <figcaption className="p-2 text-xs">
                      <p className="truncate text-text-primary" title={attachment.originalName}>{attachment.originalName}</p>
                      <p className="mt-0.5 flex items-center justify-between text-text-muted"><span>{formatSize(attachment.size)}</span><span>{attachment.group?.displayName ?? '未分组'}</span></p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 rounded-button border border-border p-2">
                    <button type="button" onClick={() => toggleSelected(attachment.id)} aria-label={selected.has(attachment.id) ? '取消选择' : '选择'}>
                      {selected.has(attachment.id) ? <CheckCircle2 className="h-5 w-5 text-brand-orange" /> : <Circle className="h-5 w-5 text-text-muted" />}
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.url} alt={attachment.originalName} loading="lazy" className="h-10 w-10 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">{attachment.originalName}</p>
                      <p className="text-xs text-text-muted">{formatSize(attachment.size)} · {attachment.group?.displayName ?? '未分组'} · {new Date(attachment.createdAt).toLocaleString('zh-CN')}</p>
                    </div>
                    <button type="button" className="text-text-muted hover:text-red-500" onClick={() => requestBatchDelete([attachment.id])} aria-label="删除附件"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => void loadAttachments(pagination.page - 1)}>上一页</Button>
                <span className="text-text-muted">第 {pagination.page} / {pagination.totalPages} 页 · 共 {pagination.total} 个</span>
                <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadAttachments(pagination.page + 1)}>下一页</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {groupForm && (
        <ConfirmDialog
          open
          title={groupForm.id ? '重命名分组' : '新建分组'}
          confirmText={groupForm.id ? '保存' : '创建'}
          cancelText="取消"
          loading={savingGroup}
          onConfirm={saveGroup}
          onCancel={() => { if (!savingGroup) setGroupForm(null) }}
        >
          <Input label="分组名称" value={groupForm.displayName} maxLength={100} onChange={(e) => setGroupForm({ ...groupForm, displayName: e.target.value })} placeholder="如：文章配图" autoFocus />
        </ConfirmDialog>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除附件"
        description={
          pendingDelete
            ? `确定删除选中的 ${pendingDelete.ids.length} 个附件吗？${pendingDelete.referenced && Object.keys(pendingDelete.referenced).length > 0
              ? `⚠️ 以下附件仍被引用，删除后相关链接将失效：${Object.entries(pendingDelete.referenced).map(([name, usages]) => `${name}（${usages.join('、')}）`).join('、')}。`
              : '引用它们的文章与动态中的链接将失效。'}`
            : undefined
        }
        confirmText="确认删除"
        cancelText="取消"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleting) setPendingDelete(null) }}
      />
    </div>
  );
}
