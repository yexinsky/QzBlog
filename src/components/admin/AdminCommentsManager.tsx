'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, Pin, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type CommentStatus = 'pending' | 'approved' | 'rejected';
type CommentItem = {
  id: string;
  parentId: string | null;
  depth: number;
  authorName: string;
  authorEmail: string;
  contentMd: string;
  status: CommentStatus;
  isPinned: boolean;
  createdAt: string;
  post: { id: string; title: string; slug: string };
};
type ApiResponse = {
  comments: CommentItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

const statusLabels: Record<CommentStatus | 'all', string> = {
  all: '全部', pending: '待审核', approved: '已通过', rejected: '已拒绝',
};
const statusStyles: Record<CommentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function AdminCommentsManager() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [status, setStatus] = useState<CommentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CommentItem | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/comments?page=${page}&limit=20&status=${status}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '加载评论失败');
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载评论失败');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  async function updateComment(comment: CommentItem, patch: Partial<Pick<CommentItem, 'status' | 'isPinned'>>, message: string) {
    setBusyId(comment.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/comments/${comment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '更新评论失败');
      setNotice(message);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新评论失败');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteComment(comment: CommentItem) {
    setBusyId(comment.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/comments/${comment.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '删除评论失败');
      setNotice('评论已删除');
      if (data?.comments.length === 1 && page > 1) setPage((value) => value - 1);
      else await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除评论失败');
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  }

  const comments = data?.comments || [];
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold text-text-primary">评论管理</h1><p className="mt-2 text-text-secondary">审核评论、处理违规内容并管理置顶状态。</p></div>
        <Button variant="secondary" onClick={() => void loadComments()} loading={loading}><RefreshCw className="mr-2 h-4 w-4" />刷新</Button>
      </div>

      <Card hover={false}>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">评论列表</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="评论状态筛选">
            {(Object.keys(statusLabels) as Array<CommentStatus | 'all'>).map((item) => (
              <Button key={item} size="sm" variant={status === item ? 'primary' : 'secondary'} onClick={() => { setStatus(item); setPage(1); }}>{statusLabels[item]}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</div>}
          {notice && <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</div>}
          {loading ? <p className="py-10 text-center text-text-muted">正在加载评论…</p> : comments.length === 0 ? <p className="py-10 text-center text-text-muted">当前筛选条件下暂无评论。</p> : (
            <div className="divide-y divide-border">
              {comments.map((comment) => {
                const busy = busyId === comment.id;
                return <article key={comment.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-text-primary">{comment.authorName}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[comment.status]}`}>{statusLabels[comment.status]}</span>
                        {comment.isPinned && <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800"><Pin className="h-3 w-3" />已置顶</span>}
                        {comment.depth > 0 && <span className="text-xs text-text-muted">回复</span>}
                      </div>
                      <p className="mt-1 text-xs text-text-muted">{comment.authorEmail} · <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString('zh-CN')}</time></p>
                      <p className="mt-1 text-xs text-text-muted">文章：<Link className="text-brand-orange hover:underline" href={`/posts/${comment.post.slug}`} target="_blank">{comment.post.title}</Link></p>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-background-subtle p-3 text-sm text-text-primary">{comment.contentMd}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {comment.status !== 'approved' && <Button size="sm" disabled={busy} loading={busy} onClick={() => void updateComment(comment, { status: 'approved' }, '评论已通过')}><Check className="mr-1 h-4 w-4" />通过</Button>}
                    {comment.status !== 'rejected' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void updateComment(comment, { status: 'rejected', isPinned: false }, '评论已拒绝')}><X className="mr-1 h-4 w-4" />拒绝</Button>}
                    <Button size="sm" variant="secondary" disabled={busy || comment.status !== 'approved'} title={comment.status !== 'approved' ? '仅已通过评论可置顶' : undefined} onClick={() => void updateComment(comment, { isPinned: !comment.isPinned }, comment.isPinned ? '已取消置顶' : '评论已置顶')}><Pin className="mr-1 h-4 w-4" />{comment.isPinned ? '取消置顶' : '置顶'}</Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={busy} onClick={() => setPendingDelete(comment)}><Trash2 className="mr-1 h-4 w-4" />删除</Button>
                  </div>
                </article>;
              })}
            </div>
          )}
          {data && data.pagination.total > 0 && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-sm text-text-muted">共 {data.pagination.total} 条，第 {data.pagination.page} / {data.pagination.totalPages} 页</p>
            <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="mr-1 h-4 w-4" />上一页</Button><Button size="sm" variant="secondary" disabled={loading || page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>下一页<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
          </div>}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除评论"
        description={pendingDelete ? `确定删除 ${pendingDelete.authorName} 的这条评论吗？该操作不可撤销，回复也可能一并删除。` : undefined}
        confirmText="确认删除"
        cancelText="取消"
        tone="danger"
        loading={busyId !== null}
        onConfirm={() => { if (pendingDelete) void deleteComment(pendingDelete) }}
        onCancel={() => { if (busyId === null) setPendingDelete(null) }}
      />
    </div>
  );
}
