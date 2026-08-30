import { db, schema } from '@/lib/db'
import { desc } from 'drizzle-orm'
import { AdminMomentsManager, type AdminMoment } from '@/components/admin/AdminMomentsManager'

export const dynamic = 'force-dynamic'

export default async function AdminMomentsPage() {
  const moments = await db.query.moments.findMany({ orderBy: [desc(schema.moments.publishedAt)], limit: 100 })
  return <AdminMomentsManager initialMoments={moments.map((moment) => ({
    ...moment,
    publishedAt: moment.publishedAt.toISOString(),
    createdAt: moment.createdAt.toISOString(),
    updatedAt: moment.updatedAt.toISOString(),
  })) as AdminMoment[]} />
}
