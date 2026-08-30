import { notFound } from 'next/navigation'
import Link from 'next/link'
import { and, desc, eq, sql } from 'drizzle-orm'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'
import { ArticleList } from '@/components/article/ArticleList'
import { db, schema } from '@/lib/db'
import { decodeParam } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

async function getCategoryBySlug(slug: string) {
  return db.query.categories.findFirst({
    where: eq(schema.categories.slug, decodeParam(slug)),
  })
}

async function getPublishedPosts(categoryId: string | null, page: number) {
  const where = categoryId
    ? and(eq(schema.posts.categoryId, categoryId), eq(schema.posts.status, 'published'))
    : and(sql`${schema.posts.categoryId} IS NULL`, eq(schema.posts.status, 'published'))

  const [posts, countRows] = await Promise.all([
    db.query.posts.findMany({
      where,
      with: {
        author: { columns: { id: true, username: true, avatarUrl: true } },
        tags: { with: { tag: true } },
      },
      orderBy: [desc(schema.posts.isPinned), desc(schema.posts.publishedAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ count: sql<number>`count(*)` }).from(schema.posts).where(where),
  ])

  return { posts, total: Number(countRows[0]?.count ?? 0) }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: '分类未找到 - Qzhou Blog' }
  return {
    title: category.name + ' - Qzhou Blog',
    description: category.description ?? '查看分类 ' + category.name + ' 下的所有文章。',
  }
}

export default async function CategoryDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? '1') || 1)

  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const { posts, total } = await getPublishedPosts(category.id, page)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
              <Link
                href="/categories"
                className="text-sm text-text-secondary hover:text-brand-orange transition-colors"
              >
                &larr; 所有分类
              </Link>
            </div>

            <PageTitle
              title={category.name}
              description={(category.description ?? '该分类下的全部文章') + ` · 共 ${total} 篇`}
            />

            <ArticleList
              articles={articles}
              variant="list"
              emptyMessage="该分类下还没有文章，去「标签」或「所有文章」看看其他内容吧。"
            />

            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-4" aria-label="分页">
                {page > 1 ? (
                  <Link
                    href={`/categories/${category.slug}?page=${page - 1}`}
                    className="px-4 py-2 rounded-button border border-border-strong text-sm text-text-primary hover:bg-background-hover transition-colors"
                  >
                    上一页
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-button border border-border text-sm text-text-muted opacity-50">上一页</span>
                )}
                <span className="text-sm text-text-muted">第 {page} / {totalPages} 页</span>
                {page < totalPages ? (
                  <Link
                    href={`/categories/${category.slug}?page=${page + 1}`}
                    className="px-4 py-2 rounded-button border border-border-strong text-sm text-text-primary hover:bg-background-hover transition-colors"
                  >
                    下一页
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-button border border-border text-sm text-text-muted opacity-50">下一页</span>
                )}
              </nav>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}
