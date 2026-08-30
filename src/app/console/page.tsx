import Link from 'next/link'
import { desc, count } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ArrowRight, FileText, Image, MessageSquare, PencilLine, Plus, User } from 'lucide-react'

export default async function AdminDashboard() {
  const [posts, moments, comments, profile, postCountRows, momentCountRows, commentCountRows] = await Promise.all([
    db.query.posts.findMany({ columns: { id: true, title: true, slug: true, status: true, viewCount: true }, orderBy: [desc(schema.posts.updatedAt)], limit: 5 }),
    db.query.moments.findMany({ columns: { id: true, content: true, createdAt: true }, orderBy: [desc(schema.moments.createdAt)], limit: 3 }),
    db.query.comments.findMany({ columns: { id: true, contentMd: true, status: true, createdAt: true }, orderBy: [desc(schema.comments.createdAt)], limit: 3 }),
    db.query.users.findFirst({ columns: { id: true, username: true, email: true, bio: true } }),
    db.select({ count: count() }).from(schema.posts),
    db.select({ count: count() }).from(schema.moments),
    db.select({ count: count() }).from(schema.comments),
  ])

  const stats = [
    { label: '文章总数', value: String(postCountRows[0]?.count ?? 0), icon: FileText, href: '/console/posts' },
    { label: '动态总数', value: String(momentCountRows[0]?.count ?? 0), icon: Image, href: '/console/moments' },
    { label: '评论总数', value: String(commentCountRows[0]?.count ?? 0), icon: MessageSquare, href: '/console/comments' },
    { label: '当前作者', value: profile?.username ?? '未配置', icon: User, href: '/console/profile' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">仪表盘</h1>
          <p className="text-text-secondary">这里汇总了后台的核心数据与快捷入口。</p>
        </div>
        <Link href="/console/posts/new"><Button><Plus className="w-4 h-4 mr-2" />新建文章</Button></Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">{stats.map((stat) => (<Card key={stat.label}><CardContent className="p-6 flex items-center justify-between gap-4"><div><p className="text-sm text-text-muted mb-1">{stat.label}</p><p className="text-2xl font-bold text-text-primary">{stat.value}</p></div><Link href={stat.href} className="w-12 h-12 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange"><stat.icon className="w-6 h-6" /></Link></CardContent></Card>))}</div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2"><CardHeader className="flex items-center justify-between"><h2 className="text-lg font-semibold text-text-primary">最近文章</h2><Link href="/console/posts"><Button variant="ghost" size="sm">查看全部 <ArrowRight className="w-4 h-4 ml-1" /></Button></Link></CardHeader><CardContent className="space-y-4">{posts.length ? posts.map((post) => (<div key={post.id} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><div className="min-w-0"><p className="font-medium text-text-primary truncate">{post.title}</p><p className="text-sm text-text-muted">/{post.slug} · {post.viewCount ?? 0} 阅读</p></div><Link href={`/console/posts/${post.slug}/edit`}><Button variant="secondary" size="sm"><PencilLine className="w-4 h-4 mr-2" />编辑</Button></Link></div>)) : <p className="text-text-muted">暂无文章数据。</p>}</CardContent></Card>
        <Card><CardHeader className="flex items-center justify-between"><h2 className="text-lg font-semibold text-text-primary">最近动态</h2><Link href="/console/moments"><Button variant="ghost" size="sm">查看全部 <ArrowRight className="w-4 h-4 ml-1" /></Button></Link></CardHeader><CardContent className="space-y-4">{moments.length ? moments.map((moment) => (<div key={moment.id} className="border-b border-border pb-4 last:border-0 last:pb-0"><p className="text-sm text-text-primary line-clamp-3">{moment.content}</p></div>)) : <p className="text-text-muted">暂无动态数据。</p>}</CardContent></Card>
        <Card className="xl:col-span-3"><CardHeader className="flex items-center justify-between"><h2 className="text-lg font-semibold text-text-primary">最近评论</h2><Link href="/console/comments"><Button variant="ghost" size="sm">查看全部 <ArrowRight className="w-4 h-4 ml-1" /></Button></Link></CardHeader><CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">{comments.length ? comments.map((comment) => (<div key={comment.id} className="rounded-lg border border-border p-4"><p className="text-sm text-text-primary line-clamp-3">{comment.contentMd}</p><p className="mt-3 text-xs text-text-muted">状态：{comment.status}</p></div>)) : <p className="text-text-muted">暂无评论数据。</p>}</CardContent></Card>
      </div>
    </div>
  )
}


