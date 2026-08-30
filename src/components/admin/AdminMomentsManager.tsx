'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input, Textarea } from '@/components/ui/Input'

export interface AdminMoment {
  id: string
  content: string
  imageUrl: string | null
  likeCount: number
  publishedAt: string
  createdAt: string
  updatedAt: string
}

interface Props { initialMoments: AdminMoment[] }

const EMPTY_FORM = { content: '', imageUrl: '' }

function apiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error
  return fallback
}

export function AdminMomentsManager({ initialMoments }: Props) {
  const [moments, setMoments] = useState(initialMoments)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteMoment, setPendingDeleteMoment] = useState<AdminMoment | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const contentLength = useMemo(() => Array.from(form.content).length, [form.content])

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setNotice('')
    document.getElementById('moment-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startEdit(moment: AdminMoment) {
    setEditingId(moment.id)
    setForm({ content: moment.content, imageUrl: moment.imageUrl || '' })
    setError('')
    setNotice('')
    document.getElementById('moment-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    const content = form.content.trim()
    if (!content) return setError('请输入动态内容。')
    if (Array.from(content).length > 500) return setError('动态内容不能超过 500 个字符。')
    if (form.imageUrl.trim()) {
      try { new URL(form.imageUrl.trim()) } catch { return setError('请输入有效的图片 URL。') }
    }

    setSaving(true)
    try {
      const response = await fetch(editingId ? `/api/moments/${editingId}` : '/api/moments', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl: form.imageUrl.trim() || null }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiMessage(payload, editingId ? '更新动态失败' : '发布动态失败'))
      const saved = payload as AdminMoment
      setMoments((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current])
      setForm(EMPTY_FORM)
      setEditingId(null)
      setNotice(editingId ? '动态已更新。' : '动态已发布。')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '操作失败，请稍后重试。')
    } finally { setSaving(false) }
  }

  async function remove(moment: AdminMoment) {
    setError('')
    setNotice('')
    setDeletingId(moment.id)
    try {
      const response = await fetch(`/api/moments/${moment.id}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiMessage(payload, '删除动态失败'))
      setMoments((current) => current.filter((item) => item.id !== moment.id))
      if (editingId === moment.id) { setEditingId(null); setForm(EMPTY_FORM) }
      setNotice('动态已删除。')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除失败，请稍后重试。')
    } finally { setDeletingId(null); setPendingDeleteMoment(null) }
  }

  return <div className="p-5 md:p-8">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-3xl font-bold text-text-primary">动态管理</h1><p className="mt-2 text-text-secondary">发布短内容、附加图片，并随时编辑或删除。</p></div>
      <Button type="button" onClick={startCreate}>新建动态</Button>
    </div>

    <Card id="moment-editor" className="mb-6 scroll-mt-6">
      <CardHeader><h2 className="text-lg font-semibold text-text-primary">{editingId ? '编辑动态' : '发布新动态'}</h2></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Textarea label="动态内容" value={form.content} maxLength={500} placeholder="分享一条新动态……" onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))} helperText={`${contentLength}/500`} disabled={saving} />
          <Input label="图片 URL（可选）" type="url" value={form.imageUrl} placeholder="https://example.com/image.jpg" onChange={(event) => setForm((value) => ({ ...value, imageUrl: event.target.value }))} helperText="支持完整的 http/https 图片地址。" disabled={saving} />
          {form.imageUrl && <div className="overflow-hidden rounded-lg border border-border bg-background-base p-2"><img src={form.imageUrl} alt="图片预览" className="max-h-64 w-auto rounded object-contain" onError={(event) => { event.currentTarget.style.display = 'none' }} /></div>}
          {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}
          <div className="flex gap-3"><Button type="submit" loading={saving}>{editingId ? '保存修改' : '发布动态'}</Button>{editingId && <Button type="button" variant="secondary" disabled={saving} onClick={startCreate}>取消编辑</Button>}</div>
        </form>
      </CardContent>
    </Card>

    <Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">动态列表（{moments.length}）</h2></CardHeader><CardContent className="space-y-5">
      {moments.length ? moments.map((moment) => <article key={moment.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
        <p className="whitespace-pre-wrap break-words text-text-primary">{moment.content}</p>
        {moment.imageUrl && <img src={moment.imageUrl} alt="动态配图" className="mt-3 max-h-72 max-w-full rounded-lg border border-border object-contain" />}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
          <span>{new Date(moment.publishedAt).toLocaleString('zh-CN')} · {moment.likeCount ?? 0} 个赞</span>
          <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => startEdit(moment)} disabled={deletingId !== null}>编辑</Button><Button size="sm" variant="ghost" onClick={() => setPendingDeleteMoment(moment)} disabled={deletingId !== null}>删除</Button></div>
        </div>
      </article>) : <p className="py-8 text-center text-text-muted">暂无动态，发布第一条动态吧。</p>}
    </CardContent></Card>

    <ConfirmDialog
      open={pendingDeleteMoment !== null}
      title="删除动态"
      description="确定删除这条动态吗？删除后无法恢复。"
      confirmText="确认删除"
      cancelText="取消"
      tone="danger"
      loading={deletingId !== null}
      onConfirm={() => { if (pendingDeleteMoment) void remove(pendingDeleteMoment) }}
      onCancel={() => { if (deletingId === null) setPendingDeleteMoment(null) }}
    />
  </div>
}
