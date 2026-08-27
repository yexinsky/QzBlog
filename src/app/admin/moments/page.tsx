import { db, schema } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default async function AdminMomentsPage() {
  const moments = await db.query.moments.findMany({ columns: { id: true, content: true, createdAt: true }, orderBy: [desc(schema.moments.createdAt)], limit: 20 })
  return (<div className="p-8"><div className="mb-6 flex items-center justify-between"><div><h1 className="text-3xl font-bold text-text-primary">动态管理</h1><p className="text-text-secondary mt-2">查看最新动态，并保留后续编辑入口。</p></div><Button type="button">新建动态</Button></div><Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">动态列表</h2></CardHeader><CardContent className="space-y-4">{moments.length ? moments.map((moment) => <div key={moment.id} className="border-b border-border pb-4 last:border-0">{moment.content}</div>) : <p className="text-text-muted">暂无动态。</p>}</CardContent></Card></div>)
}


