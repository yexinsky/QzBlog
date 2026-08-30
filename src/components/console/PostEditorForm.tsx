'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Library } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MarkdownEditorWithToolbar } from '@/components/article/MarkdownEditor'
import { AttachmentPicker, type PickerAttachment } from '@/components/console/AttachmentPicker'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'

type Status = 'draft' | 'published' | 'scheduled'
type TagOption = { id: string; name: string; color: string | null }
type SeriesOption = { id: string; title: string }
type CategoryOption = { id: string; name: string; slug: string }
type PostData = { slug: string; title: string; summary: string | null; contentMd: string; coverImage: string | null; status: Status; isPinned: boolean; scheduledAt: Date | string | null; category?: { id: string; name: string; slug: string } | null; tags?: { tag: TagOption }[]; seriesPost?: { seriesId: string; sortOrder: number; series: SeriesOption }[] }

function dateTimeLocal(value: Date | string | null | undefined) {
  if (!value) return ''
  const date = new Date(value); const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function PostEditorForm({ mode, post, tags, series, categories }: { mode: 'create' | 'edit'; post?: PostData; tags: TagOption[]; series: SeriesOption[]; categories: CategoryOption[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(post?.title ?? '')
  const [summary, setSummary] = useState(post?.summary ?? '')
  const [contentMd, setContentMd] = useState(post?.contentMd ?? '')
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? '')
  const [status, setStatus] = useState<Status>(post?.status ?? 'draft')
  const [scheduledAt, setScheduledAt] = useState(dateTimeLocal(post?.scheduledAt))
  const [isPinned, setIsPinned] = useState(post?.isPinned ?? false)
  const [tagIds, setTagIds] = useState<string[]>(post?.tags?.map(({ tag }) => tag.id) ?? [])
  const [categoryId, setCategoryId] = useState(post?.category?.id ?? '')
  const [seriesId, setSeriesId] = useState(post?.seriesPost?.[0]?.seriesId ?? '')
  const [seriesOrder, setSeriesOrder] = useState(post?.seriesPost?.[0]?.sortOrder ?? 0)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [draftBackup, setDraftBackup] = useState<{ title?: string; summary?: string; contentMd?: string; coverImage?: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const storageKey = useMemo(() => `qzblog:admin-post:${post?.slug ?? 'new'}`, [post?.slug])
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (mode !== 'create') return
    const saved = localStorage.getItem(storageKey)
    if (!saved) return
    try { const data = JSON.parse(saved); if (data && (data.title || data.summary || data.contentMd || data.coverImage)) setDraftBackup(data); else localStorage.removeItem(storageKey) } catch { localStorage.removeItem(storageKey) }
  }, [mode, storageKey])
  useEffect(() => { if (!dirtyRef.current) return; const timer = setTimeout(() => localStorage.setItem(storageKey, JSON.stringify({ title, summary, contentMd, coverImage })), 500); return () => clearTimeout(timer) }, [storageKey, title, summary, contentMd, coverImage])
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current) event.preventDefault() }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [])
  const markDirty = () => { dirtyRef.current = true }

  async function preview() {
    if (!contentMd.trim()) return setPreviewHtml('')
    setPreviewing(true); setMessage(null)
    try { const response = await fetch('/api/markdown/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentMd }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || '预览失败'); setPreviewHtml(data.html) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : '预览失败' }) } finally { setPreviewing(false) }
  }

  async function save(targetStatus: Status) {
    if (saving) return
    if (!title.trim() || !contentMd.trim()) return setMessage({ kind: 'error', text: '标题和正文不能为空' })
    if (targetStatus === 'scheduled' && !scheduledAt) return setMessage({ kind: 'error', text: '请选择定时发布时间' })
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null
    if (targetStatus === 'scheduled' && scheduledDate! <= new Date()) return setMessage({ kind: 'error', text: '定时发布时间必须晚于当前时间' })
    setSaving(true); setMessage(null)
    const payload = { title: title.trim(), contentMd, summary: summary.trim() || undefined, coverImage: coverImage.trim() || null, status: targetStatus, isPinned, scheduledAt: targetStatus === 'scheduled' ? scheduledDate!.toISOString() : undefined, tagIds, categoryId: categoryId || null, seriesId: seriesId || undefined, seriesOrder }
    try {
      const url = mode === 'create' ? '/api/posts' : `/api/posts/${encodeURIComponent(post!.slug)}`
      const response = await fetch(url, { method: mode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error === 'Validation error' ? '请检查文章字段' : data.error || '保存失败')
      dirtyRef.current = false; localStorage.removeItem(storageKey); setStatus(targetStatus); setMessage({ kind: 'success', text: targetStatus === 'draft' ? '草稿已保存' : targetStatus === 'scheduled' ? '已设置定时发布' : '文章已发布' })
      if (mode === 'create') router.replace(`/console/posts/${data.slug}/edit`); router.refresh()
    } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : '保存失败' }) } finally { setSaving(false) }
  }

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) return setMessage({ kind: 'error', text: '图片不能超过 5MB' })
    setUploading(true); setMessage(null)
    try { const form = new FormData(); form.append('file', file); const response = await fetch('/api/upload', { method: 'POST', body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || '上传失败'); setCoverImage(data.url); setContentMd((current) => `${current}${current.endsWith('\n') || !current ? '' : '\n'}![图片描述](${data.url})\n`); markDirty(); setMessage({ kind: 'success', text: '图片已上传至附件库并插入正文' }) } catch (error) { setMessage({ kind: 'error', text: error instanceof Error ? error.message : '上传失败' }) } finally { setUploading(false) }
  }

  function insertFromLibrary(items: PickerAttachment[]) {
    if (items.length === 0) return
    if (!coverImage && items[0]) setCoverImage(items[0].url)
    const markdown = items.map((item) => `![${item.originalName}](${item.url})`).join('\n')
    setContentMd((current) => `${current}${current.endsWith('\n') || !current ? '' : '\n'}${markdown}\n`)
    markDirty()
    setMessage({ kind: 'success', text: `已从附件库插入 ${items.length} 张图片` })
  }

  return <div className="p-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-text-primary">{mode === 'create' ? '新建文章' : '编辑文章'}</h1><p className="mt-2 text-text-secondary">支持 Markdown、预览、草稿、立即或定时发布。</p></div><Link href="/console/posts"><Button variant="secondary">返回列表</Button></Link></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]"><Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">文章内容</h2></CardHeader><CardContent className="space-y-4">
      {draftBackup && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-button bg-brand-orange/10 px-3 py-2 text-sm text-text-primary">
          <span>检测到未保存的本地文章草稿，是否恢复？</span>
          <span className="flex gap-2">
            <Button type="button" size="sm" onClick={() => { setTitle(draftBackup.title || ''); setSummary(draftBackup.summary || ''); setContentMd(draftBackup.contentMd || ''); setCoverImage(draftBackup.coverImage || ''); setDraftBackup(null); markDirty() }}>恢复</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => { localStorage.removeItem(storageKey); setDraftBackup(null) }}>放弃</Button>
          </span>
        </div>
      )}
      {message && <p role="status" className={`rounded-button px-3 py-2 text-sm ${message.kind === 'error' ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-700'}`}>{message.text}</p>}
      <Input label="标题" value={title} maxLength={255} onChange={(e) => { setTitle(e.target.value); markDirty() }} placeholder="请输入文章标题" />
      {mode === 'edit' && <Input label="Slug" value={post?.slug ?? ''} readOnly helperText="Slug 创建后保持稳定，避免已有链接失效。" />}
      <Textarea label="摘要" value={summary} maxLength={500} onChange={(e) => { setSummary(e.target.value); markDirty() }} placeholder="留空将自动从正文生成" />
      <div><div className="mb-1.5 flex items-center justify-between"><label className="text-sm font-medium text-text-primary">正文（Markdown）</label><div className="flex gap-2"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /><Button type="button" size="sm" variant="secondary" onClick={() => setPickerOpen(true)}><Library className="mr-2 h-4 w-4" />附件库</Button><Button type="button" size="sm" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />上传图片</Button><Button type="button" size="sm" variant="secondary" loading={previewing} onClick={preview}>刷新预览</Button></div></div><MarkdownEditorWithToolbar value={contentMd} onChange={(value) => { setContentMd(value); markDirty() }} minHeight="520px" /></div>
    </CardContent></Card><div className="space-y-6"><Card><CardHeader><h2 className="font-semibold text-text-primary">发布设置</h2></CardHeader><CardContent className="space-y-4"><label className="block text-sm font-medium text-text-primary">目标状态<select value={status} onChange={(e) => { setStatus(e.target.value as Status); markDirty() }} className="mt-1.5 w-full rounded-button border border-border bg-background-base px-4 py-2"><option value="draft">草稿</option><option value="published">立即发布</option><option value="scheduled">定时发布</option></select></label>{status === 'scheduled' && <Input label="定时发布时间" type="datetime-local" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); markDirty() }} />}<Input label="封面图片 URL" value={coverImage} onChange={(e) => { setCoverImage(e.target.value); markDirty() }} placeholder="https://..." /><label className="flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" checked={isPinned} onChange={(e) => { setIsPinned(e.target.checked); markDirty() }} />置顶文章</label><div className="flex flex-wrap gap-2"><Button type="button" loading={saving && status === 'draft'} onClick={() => save('draft')}>保存草稿</Button><Button type="button" variant="secondary" loading={saving && status !== 'draft'} onClick={() => save(status === 'draft' ? 'published' : status)}>{status === 'scheduled' ? '设置定时发布' : '发布/更新'}</Button></div></CardContent></Card>
      <Card><CardHeader><h2 className="font-semibold text-text-primary">分类组织</h2></CardHeader><CardContent className="space-y-4"><label className="block text-sm font-medium text-text-primary">分类目录<select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); markDirty() }} className="mt-1.5 w-full rounded-button border border-border bg-background-base px-4 py-2"><option value="">未分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><fieldset><legend className="mb-2 text-sm font-medium text-text-primary">标签</legend><div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">{tags.length ? tags.map((tag) => <label key={tag.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-sm"><input type="checkbox" checked={tagIds.includes(tag.id)} onChange={(e) => { setTagIds((current) => e.target.checked ? [...current, tag.id] : current.filter((id) => id !== tag.id)); markDirty() }} />{tag.name}</label>) : <span className="text-sm text-text-muted">暂无标签</span>}</div></fieldset><label className="block text-sm font-medium text-text-primary">系列<select value={seriesId} onChange={(e) => { setSeriesId(e.target.value); markDirty() }} className="mt-1.5 w-full rounded-button border border-border bg-background-base px-4 py-2"><option value="">不属于系列</option>{series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>{seriesId && <Input label="系列排序" type="number" min={0} value={seriesOrder} onChange={(e) => { setSeriesOrder(Number(e.target.value)); markDirty() }} />}</CardContent></Card>
      <Card><CardHeader><h2 className="font-semibold text-text-primary">Markdown 预览</h2></CardHeader><CardContent>{previewHtml ? <article className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <p className="text-sm text-text-muted">点击“刷新预览”检查最终渲染效果。</p>}</CardContent></Card></div></div>
    <AttachmentPicker open={pickerOpen} multiple onClose={() => setPickerOpen(false)} onSelect={insertFromLibrary} />
  </div>
}

