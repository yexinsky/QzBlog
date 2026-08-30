'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DatabaseBackup, Download, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type BackupRecord = {
  id: string;
  filename: string;
  size: number;
  status: 'running' | 'success' | 'failed';
  note: string | null;
  createdAt: string;
};

const statusLabels = { running: '进行中', success: '成功', failed: '失败' };
const statusStyles = {
  running: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function AdminBackupManager() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<File | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BackupRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/backup', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载备份列表失败');
      setBackups(data.backups ?? []);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '加载备份列表失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createBackup() {
    setCreating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '备份失败');
      setMessage({ kind: 'success', text: `备份已生成：${data.filename}（${formatSize(data.size)}）` });
      await load();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '备份失败' });
    } finally {
      setCreating(false);
    }
  }

  async function restoreFile(file: File) {
    setRestoring(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/admin/backup/restore', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '恢复失败');
      setMessage({ kind: 'success', text: '恢复完成，已自动先对当前状态做了备份' });
      await load();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '恢复失败' });
    } finally {
      setRestoring(false);
      setPendingRestore(null);
    }
  }

  async function deleteBackup() {
    if (!pendingDelete) return;
    setDeleting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/backup/${pendingDelete.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      await load();
      setMessage({ kind: 'success', text: '备份已删除' });
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
          <h1 className="text-3xl font-bold text-text-primary">备份与恢复</h1>
          <p className="mt-2 text-text-secondary">整站数据库 + 附件打包备份，与数据导出互补；恢复前会自动先备份当前状态。</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".gz" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setPendingRestore(file); e.target.value = ''; }} />
          <Button variant="secondary" loading={restoring} onClick={() => fileInputRef.current?.click()}><RotateCcw className="mr-2 h-4 w-4" />上传备份包恢复</Button>
          <Button loading={creating} onClick={createBackup}><DatabaseBackup className="mr-2 h-4 w-4" />创建备份</Button>
        </div>
      </div>

      {message && (
        <p role="status" className={`mb-4 rounded-button px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-700'}`}>{message.text}</p>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold text-text-primary">备份列表</h2></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-10 text-center text-text-muted">加载中…</div>
          ) : backups.length ? backups.map((backup) => (
            <article key={backup.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-text-primary">{backup.filename}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyles[backup.status]}`}>{statusLabels[backup.status]}</span>
                </div>
                <p className="mt-0.5 text-xs text-text-muted">
                  {new Date(backup.createdAt).toLocaleString('zh-CN')} · {formatSize(backup.size)}{backup.note ? ` · ${backup.note}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {backup.status === 'success' && (
                  <a href={`/api/admin/backup/${backup.id}/download`} aria-label="下载备份包">
                    <Button type="button" variant="secondary" size="sm"><Download className="mr-2 h-4 w-4" />下载</Button>
                  </a>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendingDelete(backup)}><Trash2 className="mr-2 h-4 w-4" />删除</Button>
              </div>
            </article>
          )) : (
            <div className="py-10 text-center text-text-muted">还没有备份，点击「创建备份」开始保护你的数据。</div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingRestore !== null}
        title="整站恢复"
        description={pendingRestore ? `确定用「${pendingRestore.name}」恢复整站数据吗？恢复会覆盖现有文章、动态、评论等全部数据，执行前会自动先备份当前状态。` : undefined}
        confirmText="确认恢复"
        cancelText="取消"
        tone="danger"
        loading={restoring}
        onConfirm={() => { if (pendingRestore) void restoreFile(pendingRestore) }}
        onCancel={() => { if (!restoring) setPendingRestore(null) }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除备份"
        description={pendingDelete ? `确定删除备份「${pendingDelete.filename}」吗？该操作不可撤销。` : undefined}
        confirmText="确认删除"
        cancelText="取消"
        tone="danger"
        loading={deleting}
        onConfirm={deleteBackup}
        onCancel={() => { if (!deleting) setPendingDelete(null) }}
      />
    </div>
  );
}
