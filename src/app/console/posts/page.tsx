import { asc, desc, ne } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { PostListManager } from '@/components/console/PostListManager'

export default async function AdminPostsPage() {
  const [posts, categories] = await Promise.all([
    db.query.posts.findMany({
      columns: { id: true, title: true, slug: true, summary: true, status: true, isPinned: true, categoryId: true, visibility: true, scheduledAt: true, publishedAt: true, updatedAt: true },
      where: ne(schema.posts.status, 'recycled'),
      orderBy: [desc(schema.posts.updatedAt)],
    }),
    db.query.categories.findMany({ orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.createdAt)] }),
  ])
  return (
    <PostListManager
      initialPosts={posts.map((post) => ({
        ...post,
        status: post.status as 'draft' | 'published' | 'scheduled',
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        updatedAt: post.updatedAt.toISOString(),
      }))}
      categories={categories.map(({ id, name }) => ({ id, name }))}
    />
  )
}
