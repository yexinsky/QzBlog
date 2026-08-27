import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PencilLine, Plus } from 'lucide-react'

export default async function AdminCommentsPage() {
  const comments = await db.query.comments.findMany({ columns: { id: true, contentMd: true, status: true }, orderBy: [desc(schema.comments.createdAt)], limit: 20 })
  return (<div className="p-8"><div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-text-primary">评论管理</h1><p className="text-text-secondary mt-2">浏览最新评论，按钮已指向可用页面。</p></div><Link href="/admin/posts/new"><Button><Plus className="w-4 h-4 mr-2" />新建文章</Button></Link></div><Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">评论列表</h2></CardHeader><CardContent className="space-y-4">{comments.length ? comments.map((comment) => <div key={comment.id} className="border-b border-border pb-4 last:border-0"><p className="text-text-primary">{comment.contentMd}</p><p className="text-xs text-text-muted mt-2">状态：{comment.status}</p></div>) : <p className="text-text-muted">暂无评论。</p>}</CardContent></Card></div>)
}


