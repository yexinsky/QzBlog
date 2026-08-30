import { desc } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { PostListManager } from '@/components/admin/PostListManager'

export default async function AdminPostsPage() {
  const posts = await db.query.posts.findMany({
    columns: { id: true, title: true, slug: true, summary: true, status: true, isPinned: true, scheduledAt: true, publishedAt: true, updatedAt: true },
    orderBy: [desc(schema.posts.updatedAt)],
  })
  return <PostListManager initialPosts={posts.map((post) => ({ ...post, scheduledAt: post.scheduledAt?.toISOString() ?? null, publishedAt: post.publishedAt?.toISOString() ?? null, updatedAt: post.updatedAt.toISOString() }))} />
}
