import { notFound } from 'next/navigation'
import { eq, desc } from 'drizzle-orm'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'
import { ArticleList } from '@/components/article/ArticleList'
import { TagCloud } from '@/components/ui/Tag'
import { db, schema } from '@/lib/db'
import { decodeParam } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getTagBySlug(slug: string) {
  return await db.query.tags.findFirst({
    where: eq(schema.tags.slug, decodeParam(slug)),
  })
}

async function getPostsByTagId(tagId: string) {
  // 使用子查询代替联接：先拿 postIds，再取分页后的 posts
  const ids = await db
    .select({ postId: schema.postTags.postId })
    .from(schema.postTags)
    .where(eq(schema.postTags.tagId, tagId))
  if (ids.length === 0) return []

  const posts = await db.query.posts.findMany({
    where: eq(schema.posts.status, 'published'),
    with: {
      author: { columns: { id: true, username: true, avatarUrl: true } },
      tags: {
        with: { tag: true },
        where: eq(schema.postTags.tagId, tagId),
      },
    },
    orderBy: [desc(schema.posts.isPinned), desc(schema.posts.publishedAt)],
  })

  const allowed = new Set(ids.map((x) => x.postId))
  return posts.filter((p) => allowed.has(p.id))
}

async function getOtherTags() {
  const tags = await db.query.tags.findMany({
    with: { posts: { columns: { postId: true } } },
    orderBy: [desc(schema.tags.createdAt)],
    limit: 20,
  })
  return tags.map((t) => ({
    name: t.name,
    href: '/tags/' + t.slug,
    count: t.posts?.length ?? 0,
  }))
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const tag = await getTagBySlug(resolvedParams.slug)
  if (!tag) return { title: '标签未找到 - Qzhou Blog' }
  return {
    title: '#' + tag.name + ' - Qzhou Blog',
    description: '查看标签为 ' + tag.name + ' 的所有文章。',
  }
}

export default async function TagDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const tag = await getTagBySlug(resolvedParams.slug)
  if (!tag) notFound()

  const [posts, otherTags] = await Promise.all([
    getPostsByTagId(tag.id),
    getOtherTags(),
  ])

  const articles = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.summary ?? undefined,
    coverImage: post.coverImage ?? undefined,
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    readingTime: Math.max(1, Math.ceil((post.wordCount || 0) / 300)),
    views: post.viewCount ?? 0,
    tags: (post.tags || []).map((pt) => pt.tag).map((t) => ({ name: t.name, slug: t.slug })),
    author: post.author
      ? { name: post.author.username, avatar: post.author.avatarUrl ?? undefined }
      : undefined,
  }))

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container>
            <div className="mb-6">
              <a
                href="/tags"
                className="text-sm text-text-secondary hover:text-brand-orange transition-colors"
              >
                &larr; 所有标签
              </a>
            </div>

            <PageTitle
              title={'#' + tag.name}
              description={'共 ' + posts.length + ' 篇文章使用此标签。'}
            />

            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 min-w-0">
                <ArticleList
                  articles={articles}
                  variant="list"
                  emptyMessage="该标签下还没有文章。"
                />
              </div>

              <aside className="w-full lg:w-80 lg:sticky lg:top-24 lg:h-fit space-y-6">
                {otherTags.length > 0 && (
                  <div className="bg-background-base rounded-card shadow-card p-6">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">其他标签</h3>
                    <TagCloud tags={otherTags.filter((t) => t.href !== '/tags/' + tag.slug)} />
                  </div>
                )}
              </aside>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}



