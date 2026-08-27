import { db } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'

export default async function AdminProfilePage() {
  const user = await db.query.users.findFirst({ columns: { username: true, email: true, avatarUrl: true, bio: true } })
  return (<div className="p-8"><h1 className="text-3xl font-bold text-text-primary mb-2">个人资料</h1><p className="text-text-secondary mb-6">只读加载当前资料，并保留表单外观。</p><Card><CardHeader><h2 className="text-lg font-semibold text-text-primary">资料表单</h2></CardHeader><CardContent className="space-y-4"><Input label="用户名" defaultValue={user?.username ?? ''} /><Input label="邮箱" defaultValue={user?.email ?? ''} /><Input label="头像 URL" defaultValue={user?.avatarUrl ?? ''} /><Textarea label="简介" defaultValue={user?.bio ?? ''} /><Button type="button">保存资料</Button></CardContent></Card></div>)
}


