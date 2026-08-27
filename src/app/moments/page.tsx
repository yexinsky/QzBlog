import { desc } from 'drizzle-orm'
import { Calendar } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'
import { db, schema } from '@/lib/db'
import { formatDate } from '@/lib/utils'

export const metadata = {
  title: '动态 - Qzhou Blog',
  description: '记录生活的片段，分享即时的想法。',
}

async function getMoments(page: number) {
  const limit = 20
  const offset = (page - 1) * limit
  const moments = await db.query.moments.findMany({
    orderBy: [desc(schema.moments.publishedAt)],
    limit,
    offset,
  })

  return moments.map((m) => ({
    id: m.id,
    content: m.content,
    imageUrl: m.imageUrl ?? undefined,
    likeCount: m.likeCount ?? 0,
    publishedAt: (m.publishedAt ?? m.createdAt).toISOString(),
  }))
}

interface PageProps {
  searchParams?: Promise<{ page?: string }>
}

export default async function MomentsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const page = Math.max(1, parseInt(resolvedSearchParams?.page ?? '1', 10) || 1)
  const moments = await getMoments(page)

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container maxWidth="md">
            <PageTitle
              title="动态"
              description="随手记录、即刻分享。"
            />

            {moments.length === 0 ? (
              <div className="bg-background-base rounded-card shadow-card p-12 text-center">
                <p className="text-text-muted">还没有任何动态。</p>
              </div>
            ) : (
              <ol className="relative border-l-2 border-border ml-3 space-y-8">
                {moments.map((m) => (
                  <li key={m.id} className="pl-6 relative">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-brand-orange ring-4 ring-background-cream" />
                    <article className="bg-background-base rounded-card shadow-card p-5">
                      <div className="flex items-center gap-1 text-xs text-text-muted mb-2">
                        <Calendar className="w-3 h-3" />
                        <time dateTime={m.publishedAt}>{formatDate(m.publishedAt)}</time>
                        {m.likeCount > 0 && (
                          <span className="ml-2">· {m.likeCount} 喜欢</span>
                        )}
                      </div>
                      <p className="text-text-secondary leading-relaxed whitespace-pre-line break-words">
                        {m.content}
                      </p>
                      {m.imageUrl && (
                        <div className="mt-3 overflow-hidden rounded-button">
                          <a href={'/moments/' + m.id}>
                            <img
                              src={m.imageUrl}
                              alt="动态图片"
                              className="w-full h-auto hover:scale-[1.02] transition-transform"
                            />
                          </a>
                        </div>
                      )}
                      <div className="mt-3">
                        <a
                          href={'/moments/' + m.id}
                          className="text-xs text-text-muted hover:text-brand-orange transition-colors"
                        >
                          查看详情 →
                        </a>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            )}

            {page > 1 && (
              <div className="text-center pt-6">
                <a
                  href={page === 2 ? '/moments' : '/moments?page=' + (page - 1)}
                  className="text-sm text-text-secondary hover:text-brand-orange transition-colors"
                >
                  &larr; 上一页
                </a>
              </div>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}



