'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'

type AdminPost = { id: string; title: string; slug: string; summary: string | null; status: 'draft' | 'published' | 'scheduled'; isPinned: boolean; scheduledAt: string | null; publishedAt: string | null; updatedAt: string }

const statusLabels = { draft: '草稿', published: '已发布', scheduled: '定时发布' }

export function PostListManager({ initialPosts }: { initialPosts: AdminPost[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'all' | AdminPost['status']>('all')
  const [pendingDelete, setPendingDelete] = useState<AdminPost | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState('')
  const filtered = useMemo(() => posts.filter((post) => (status === 'all' || post.status === status) && `${post.title} ${post.summary ?? ''} ${post.slug}`.toLowerCase().includes(keyword.toLowerCase())), [posts, keyword, status])

  async function remove(post: AdminPost) {
    setDeleting(true); setMessage('')
    try {
      const response = await fetch(`/api/posts/${encodeURIComponent(post.slug)}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '删除失败')
      setPosts((current) => current.filter((item) => item.id !== post.id)); setMessage('文章已删除')
    } catch (error) { setMessage(error instanceof Error ? error.message : '删除失败') } finally { setDeleting(false); setPendingDelete(null) }
  }

  return <div className="p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-text-primary">文章管理</h1><p className="mt-2 text-text-secondary">搜索、筛选、创建、编辑和删除文章。</p></div><Link href="/admin/posts/new"><Button><Plus className="mr-2 h-4 w-4" />新建文章</Button></Link></div>
    <Card><CardHeader><div className="flex flex-wrap items-end gap-3"><div className="min-w-[240px] flex-1"><Input label="搜索文章" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="标题、摘要或 Slug" /></div><label className="text-sm font-medium text-text-primary">状态<select className="mt-1 block rounded-button border border-border bg-background-base px-4 py-2" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">全部状态</option><option value="draft">草稿</option><option value="published">已发布</option><option value="scheduled">定时发布</option></select></label></div></CardHeader><CardContent className="space-y-4">
      {message && <p role="status" className="rounded-button bg-background-hover px-3 py-2 text-sm text-text-secondary">{message}</p>}
      {filtered.length ? filtered.map((post) => <article key={post.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium text-text-primary">{post.title}</p>{post.isPinned && <span className="rounded-full bg-brand-orange/15 px-2 py-0.5 text-xs text-brand-orange">置顶</span>}<span className="rounded-full bg-background-hover px-2 py-0.5 text-xs text-text-secondary">{statusLabels[post.status]}</span></div><p className="truncate text-sm text-text-muted">{post.summary || '暂无摘要'} · /{post.slug}</p><p className="mt-1 text-xs text-text-muted">更新于 {new Date(post.updatedAt).toLocaleString('zh-CN')}{post.status === 'scheduled' && post.scheduledAt ? ` · 将于 ${new Date(post.scheduledAt).toLocaleString('zh-CN')} 发布` : ''}</p></div><div className="flex gap-2"><Link href={`/admin/posts/${post.slug}/edit`}><Button variant="secondary" size="sm"><PencilLine className="mr-2 h-4 w-4" />编辑</Button></Link><Button type="button" variant="ghost" size="sm" onClick={() => setPendingDelete(post)}><Trash2 className="mr-2 h-4 w-4" />删除</Button></div></article>) : <div className="py-10 text-center text-text-muted"><Search className="mx-auto mb-2 h-6 w-6" />没有符合条件的文章</div>}
    </CardContent></Card>
    <ConfirmDialog
      open={pendingDelete !== null}
      title="删除文章"
      description={pendingDelete ? `确定永久删除《${pendingDelete.title}》吗？此操作不可撤销。` : undefined}
      confirmText="确认删除"
      cancelText="取消"
      tone="danger"
      loading={deleting}
      onConfirm={() => { if (pendingDelete) remove(pendingDelete) }}
      onCancel={() => { if (!deleting) setPendingDelete(null) }}
    />
  </div>
}
