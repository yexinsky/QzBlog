import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { PencilLine, Plus } from 'lucide-react'

export default async function AdminPostsPage() {
  const posts = await db.query.posts.findMany({ columns: { id: true, title: true, slug: true, summary: true }, orderBy: [desc(schema.posts.updatedAt)], limit: 20 })
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold text-text-primary">文章管理</h1><p className="text-text-secondary mt-2">浏览、创建和编辑文章。</p></div><Link href="/admin/posts/new"><Button><Plus className="w-4 h-4 mr-2" />新建文章</Button></Link></div>
      <Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">文章列表</h2></CardHeader><CardContent className="space-y-4">{posts.length ? posts.map((post) => (<div key={post.id} className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><div className="min-w-0"><p className="font-medium text-text-primary truncate">{post.title}</p><p className="text-sm text-text-muted truncate">{post.summary ?? '暂无摘要'} · /{post.slug}</p></div><Link href={`/admin/posts/${post.slug}/edit`}><Button variant="secondary" size="sm"><PencilLine className="w-4 h-4 mr-2" />编辑</Button></Link></div>)) : <p className="text-text-muted">暂无文章，先创建一篇吧。</p>}</CardContent></Card>
    </div>
  )
}


