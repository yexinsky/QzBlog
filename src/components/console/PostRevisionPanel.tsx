'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

type Revision = { id: string; title: string; wordCount: number; createdAt: string };

/**
 * 版本历史面板（v1.1，PRD 11.13）：列表（时间 + 字数）、查看快照、一键回滚。
 * 回滚动作本身生成新快照，可再次撤销。
 */
export function PostRevisionPanel({ postId, onRestored }: { postId: string; onRestored: () => void }) {
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<{ id: string; title: string; contentMd: string; createdAt: string } | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/posts/${postId}/revisions`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载版本失败');
      setRevisions(data.revisions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载版本失败');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function view(revisionId: string) {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/posts/${postId}/revisions?revisionId=${revisionId}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载快照失败');
      setViewing(data.revision);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载快照失败');
    }
  }

  async function rollback(revisionId: string) {
    if (!confirm('确定回滚到此版本吗？当前内容会先自动生成一份快照。')) return;
    setRollingBack(revisionId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/posts/${postId}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '回滚失败');
      setMessage('已回滚，编辑器内容即将刷新');
      setViewing(null);
      await load();
      onRestored();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '回滚失败');
    } finally {
      setRollingBack(null);
    }
  }

  if (!postId) return null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="font-semibold text-text-primary flex items-center gap-2"><History className="h-4 w-4" />版本历史（≤20 条）</h2>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen((value) => !value)}>{open ? '收起' : '展开'}</Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {message && <p role="status" className="rounded-button bg-background-hover px-3 py-2 text-sm text-text-secondary">{message}</p>}
          {loading ? (
            <p className="py-4 text-center text-sm text-text-muted">加载中…</p>
          ) : revisions.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">还没有版本快照，保存后自动生成。</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {revisions.map((revision) => (
                <div key={revision.id} className="flex items-center justify-between gap-2 rounded-button px-2 py-1.5 text-sm hover:bg-background-hover">
                  <button type="button" className="min-w-0 flex-1 text-left text-text-secondary hover:text-brand-orange" onClick={() => void view(revision.id)}>
                    {new Date(revision.createdAt).toLocaleString('zh-CN')} · {revision.wordCount} 字
                  </button>
                  <Button type="button" size="sm" variant="ghost" loading={rollingBack === revision.id} onClick={() => void rollback(revision.id)}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />回滚
                  </Button>
                </div>
              ))}
            </div>
          )}

          {viewing && (
            <div className="rounded-button border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">快照：{new Date(viewing.createdAt).toLocaleString('zh-CN')}</p>
                <button type="button" onClick={() => setViewing(null)} aria-label="关闭快照预览"><X className="h-4 w-4 text-text-muted" /></button>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-button bg-background-hover p-3 text-xs text-text-secondary">{viewing.contentMd}</pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
