import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { AdminPostEditor } from '../../shared'
import { decodeParam } from '@/lib/utils'

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const post = await db.query.posts.findFirst({
    where: eq(schema.posts.slug, decodeParam(rawSlug)),
    with: { category: true, tags: { with: { tag: true } }, seriesPost: { with: { series: true } } },
  })
  if (!post) notFound()
  return <AdminPostEditor mode="edit" post={post} />
}
