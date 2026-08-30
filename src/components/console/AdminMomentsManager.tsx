'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Textarea } from '@/components/ui/Input'

const MAX_IMAGES = 9

export interface AdminMoment {
  id: string
  content: string
  contentMd?: string | null
  images?: string[] | null
  imageUrl: string | null
  likeCount: number
  publishedAt: string
  createdAt: string
  updatedAt: string
}

interface Props { initialMoments: AdminMoment[] }

const EMPTY_FORM = { contentMd: '', images: [] as string[] }

function apiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') return payload.error
  return fallback
}

export function AdminMomentsManager({ initialMoments }: Props) {
  const [moments, setMoments] = useState(initialMoments)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteMoment, setPendingDeleteMoment] = useState<AdminMoment | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const contentLength = useMemo(() => Array.from(form.contentMd).length, [form.contentMd])

  function startCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setNotice('')
    document.getElementById('moment-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function startEdit(moment: AdminMoment) {
    setEditingId(moment.id)
    setForm({ contentMd: moment.contentMd ?? moment.content, images: moment.images ?? (moment.imageUrl ? [moment.imageUrl] : []) })
    setError('')
    setNotice('')
    document.getElementById('moment-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function uploadImages(files: File[]) {
    if (files.length === 0) return
    const room = MAX_IMAGES - form.images.length
    if (room <= 0) return setError(`最多上传 ${MAX_IMAGES} 张图片。`)
    setUploading(true)
    setError('')
    try {
      const uploaded: string[] = []
      for (const file of files.slice(0, room)) {
        const body = new FormData()
        body.append('file', file)
        const response = await fetch('/api/upload', { method: 'POST', body })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(apiMessage(payload, `上传「${file.name}」失败`))
        if (payload?.url) uploaded.push(payload.url)
      }
      setForm((value) => ({ ...value, images: [...value.images, ...uploaded].slice(0, MAX_IMAGES) }))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '上传失败，请稍后重试。')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    const contentMd = form.contentMd.trim()
    if (!contentMd) return setError('请输入动态内容。')
    if (Array.from(contentMd).length > 500) return setError('动态内容不能超过 500 个字符。')

    setSaving(true)
    try {
      const response = await fetch(editingId ? `/api/moments/${editingId}` : '/api/moments', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { contentMd, images: form.images } : { contentMd, images: form.images }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiMessage(payload, editingId ? '更新动态失败' : '发布动态失败'))
      const saved = payload as AdminMoment
      setMoments((current) => editingId ? current.map((item) => item.id === saved.id ? { ...saved, images: saved.images ?? [] } : item) : [{ ...saved, images: saved.images ?? [] }, ...current])
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
      <div><h1 className="text-3xl font-bold text-text-primary">动态管理</h1><p className="mt-2 text-text-secondary">发布 Markdown 短内容，支持最多 {MAX_IMAGES} 张图片。</p></div>
      <Button type="button" onClick={startCreate}>新建动态</Button>
    </div>

    <Card id="moment-editor" className="mb-6 scroll-mt-6">
      <CardHeader><h2 className="text-lg font-semibold text-text-primary">{editingId ? '编辑动态' : '发布新动态'}</h2></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Textarea label="动态内容（Markdown，纯文字限 500 字）" value={form.contentMd} maxLength={500} placeholder="分享一条新动态，支持 **加粗**、`代码`、[链接](https://)…" onChange={(event) => setForm((value) => ({ ...value, contentMd: event.target.value }))} helperText={`${contentLength}/500`} disabled={saving} />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">图片（≤{MAX_IMAGES} 张）</label>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => { void uploadImages(Array.from(e.target.files ?? [])) }} />
              <Button type="button" size="sm" variant="secondary" loading={uploading} onClick={() => fileInputRef.current?.click()} disabled={form.images.length >= MAX_IMAGES}><ImagePlus className="mr-2 h-4 w-4" />上传图片</Button>
            </div>
            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.images.map((url, index) => (
                  <div key={`${url}-${index}`} className="group relative">
                    <img src={url} alt={`配图 ${index + 1}`} className="h-20 w-20 rounded-lg border border-border object-cover" />
                    <button type="button" aria-label="移除图片" className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white shadow" onClick={() => setForm((value) => ({ ...value, images: value.images.filter((_, i) => i !== index) }))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}
          <div className="flex gap-3"><Button type="submit" loading={saving}>{editingId ? '保存修改' : '发布动态'}</Button>{editingId && <Button type="button" variant="secondary" disabled={saving} onClick={startCreate}>取消编辑</Button>}</div>
        </form>
      </CardContent>
    </Card>

    <Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">动态列表（{moments.length}）</h2></CardHeader><CardContent className="space-y-5">
      {moments.length ? moments.map((moment) => <article key={moment.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
        <p className="whitespace-pre-wrap break-words text-text-primary">{moment.contentMd ?? moment.content}</p>
        {(moment.images?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(moment.images ?? []).map((url, index) => <img key={`${url}-${index}`} src={url} alt={`动态配图 ${index + 1}`} className="h-20 w-20 rounded-lg border border-border object-cover" />)}
          </div>
        )}
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
