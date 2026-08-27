import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { AdminPostEditor } from '../../shared'

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug) })
  if (!post) notFound()
  return <AdminPostEditor mode="edit" post={post} />
}




