'use client';

import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Search, Trash2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';

type RecycledPost = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  wordCount: number;
  updatedAt: string;
};

export function RecycleBinManager() {
  const [posts, setPosts] = useState<RecycledPost[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<RecycledPost | null>(null);
  const [pendingPurge, setPendingPurge] = useState<RecycledPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword.trim()) params.set('keyword', keyword.trim());
      const response = await fetch(`/api/admin/recycle-bin?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '加载回收站失败');
      setPosts(data.posts ?? []);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '加载回收站失败' });
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), keyword ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, keyword]);

  async function restore() {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/recycle-bin/${pendingRestore.id}`, { method: 'PUT' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '恢复失败');
      setMessage({ kind: 'success', text: `《${pendingRestore.title}》已恢复为草稿` });
      await load();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '恢复失败' });
    } finally {
      setBusy(false);
      setPendingRestore(null);
    }
  }

  async function purge() {
    if (!pendingPurge) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/recycle-bin/${pendingPurge.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '删除失败');
      setMessage({ kind: 'success', text: `《${pendingPurge.title}》已彻底删除` });
      await load();
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : '删除失败' });
    } finally {
      setBusy(false);
      setPendingPurge(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">回收站</h1>
          <p className="mt-2 text-text-secondary">已删除文章在此保留，可恢复为草稿或彻底删除。回收站文章不在前台展示。</p>
        </div>
        <div className="w-64"><Input label="搜索回收站" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="标题或 Slug" /></div>
      </div>

      {message && (
        <p role="status" className={`mb-4 rounded-button px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-700'}`}>{message.text}</p>
      )}

      <Card>
        <CardHeader><h2 className="font-semibold text-text-primary">已删除文章</h2></CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-10 text-center text-text-muted">加载中…</div>
          ) : posts.length ? posts.map((post) => (
            <article key={post.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary">{post.title}</p>
                <p className="truncate text-sm text-text-muted">/{post.slug} · {post.wordCount} 字</p>
                <p className="mt-1 text-xs text-text-muted">删除于 {new Date(post.updatedAt).toLocaleString('zh-CN')}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setPendingRestore(post)}><RotateCcw className="mr-2 h-4 w-4" />恢复为草稿</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPendingPurge(post)}><Trash2 className="mr-2 h-4 w-4" />彻底删除</Button>
              </div>
            </article>
          )) : (
            <div className="py-10 text-center text-text-muted"><Trash className="mx-auto mb-2 h-6 w-6" />回收站是空的</div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingRestore !== null}
        title="恢复文章"
        description={pendingRestore ? `将《${pendingRestore.title}》恢复为草稿？恢复后可在文章管理中继续编辑。` : undefined}
        confirmText="恢复"
        cancelText="取消"
        loading={busy}
        onConfirm={restore}
        onCancel={() => { if (!busy) setPendingRestore(null) }}
      />
      <ConfirmDialog
        open={pendingPurge !== null}
        title="彻底删除"
        description={pendingPurge ? `确定彻底删除《${pendingPurge.title}》吗？该操作不可撤销，文章及其评论、点赞数据将被永久移除。` : undefined}
        confirmText="永久删除"
        cancelText="取消"
        tone="danger"
        loading={busy}
        onConfirm={purge}
        onCancel={() => { if (!busy) setPendingPurge(null) }}
      />
    </div>
  );
}
