import { desc, eq, and, sql } from 'drizzle-orm'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'
import { MomentCard } from '@/components/moments/MomentCard'
import { db, schema } from '@/lib/db'
import { renderMarkdown } from '@/lib/markdown'

export const dynamic = 'force-dynamic'

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

  // 每条动态的已审核评论数（v1.1 动态评论，PRD 11.7）
  const commentCounts = moments.length
    ? await db
        .select({ targetId: schema.comments.targetId, count: sql<number>`count(*)` })
        .from(schema.comments)
        .where(and(eq(schema.comments.targetType, 'moment'), sql`${schema.comments.targetId} IN (${sql.join(moments.map((m) => sql`${m.id}`), sql`, `)})`, eq(schema.comments.status, 'approved')))
        .groupBy(schema.comments.targetId)
    : []
  const countByMoment = new Map(commentCounts.map((row) => [row.targetId, Number(row.count)]))

  // 服务端统一渲染 Markdown（复用文章的 sanitize 管线）
  return Promise.all(
    moments.map(async (m) => ({
      id: m.id,
      contentHtml: m.contentMd ? await renderMarkdown(m.contentMd) : '',
      plainContent: m.content,
      images: m.images ?? (m.imageUrl ? [m.imageUrl] : []),
      likeCount: m.likeCount ?? 0,
      publishedAt: (m.publishedAt ?? m.createdAt).toISOString(),
      commentCount: countByMoment.get(m.id) ?? 0,
    }))
  )
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
                    <MomentCard
                      id={m.id}
                      contentHtml={m.contentHtml || `<p>${m.plainContent.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`}
                      images={m.images}
                      likeCount={m.likeCount}
                      publishedAt={m.publishedAt}
                      commentCount={m.commentCount}
                    />
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
