import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { eq } from 'drizzle-orm'
import { authOptions } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { AdminProfileForm } from '@/components/console/AdminProfileForm'

export default async function AdminProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'admin') notFound()
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: { username: true, email: true, avatarUrl: true, bio: true },
  })
  if (!user) notFound()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-text-primary mb-2">个人资料</h1>
      <p className="text-text-secondary mb-6">更新管理账号的公开资料与联系方式。</p>
      <Card hover={false}>
        <CardHeader><h2 className="text-lg font-semibold text-text-primary">资料表单</h2></CardHeader>
        <CardContent><AdminProfileForm initialProfile={user} /></CardContent>
      </Card>
    </div>
  )
}
