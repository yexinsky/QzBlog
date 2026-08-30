import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { asc, desc } from 'drizzle-orm'
import { authOptions } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { PostEditorForm } from '@/components/console/PostEditorForm'

export async function AdminPostEditor({ mode, post }: { mode: 'create' | 'edit'; post?: any }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'admin') redirect('/console/login?callbackUrl=/console/posts')

  const [tags, series, categories] = await Promise.all([
    db.query.tags.findMany({ orderBy: [desc(schema.tags.createdAt)] }),
    db.query.series.findMany({ orderBy: [desc(schema.series.isPinned), desc(schema.series.updatedAt)] }),
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.createdAt)] }),
  ])

  return <PostEditorForm mode={mode} post={post} tags={tags} series={series} categories={categories} />
}
