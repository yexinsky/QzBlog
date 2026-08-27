import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'

export function AdminPostEditor({ mode, post }: { mode: 'create' | 'edit'; post?: any }) {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-text-primary">{mode === 'create' ? '新建文章' : '编辑文章'}</h1><p className="text-text-secondary mt-2">提供可用的表单骨架，后续可接入保存接口。</p></div><Link href="/admin/posts"><Button variant="secondary">返回列表</Button></Link></div>
      <Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">文章表单</h2></CardHeader><CardContent className="space-y-4"><Input label="标题" defaultValue={post?.title ?? ''} placeholder="请输入文章标题" /><Input label="Slug" defaultValue={post?.slug ?? ''} placeholder="example-post" /><Textarea label="摘要" defaultValue={post?.summary ?? ''} placeholder="文章摘要" /><Textarea label="正文" defaultValue={post?.contentMd ?? ''} placeholder="Markdown 内容" className="min-h-[320px]" /><div className="flex gap-3"><Button type="button">保存草稿</Button><Button type="button" variant="secondary">发布/更新</Button></div></CardContent></Card>
    </div>
  )
}
