import { notFound } from 'next/navigation'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { Calendar, ArrowLeft, Heart } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section } from '@/components/layout/Container'
import { db, schema } from '@/lib/db'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getMomentById(id: string) {
  // 接受 uuid 或纯短 id (仅作可访问性回退)。仅当合法 uuid 时查询数据库。
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidLike.test(id)) return null
  return await db.query.moments.findFirst({
    where: eq(schema.moments.id, id),
  })
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const m = await getMomentById(resolvedParams.id)
  if (!m) return { title: '动态未找到 - Qzhou Blog' }
  return {
    title: '动态 - Qzhou Blog',
    description: m.content.slice(0, 100),
  }
}

export default async function MomentDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const moment = await getMomentById(resolvedParams.id)
  if (!moment) notFound()

  const publishedAt = (moment.publishedAt ?? moment.createdAt).toISOString()

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container maxWidth="md">
            <Link
              href="/moments"
              className="inline-flex items-center text-sm text-text-secondary hover:text-brand-orange mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              回到动态列表
            </Link>

            <article className="bg-background-base rounded-card shadow-card p-6 md:p-8">
              <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  <span>{moment.likeCount ?? 0} 喜欢</span>
                </span>
              </div>

              <p className="text-text-primary text-lg leading-relaxed whitespace-pre-line break-words">
                {moment.content}
              </p>

              {moment.imageUrl && (
                <div className="mt-6 overflow-hidden rounded-button">
                  <img
                    src={moment.imageUrl}
                    alt="动态图片"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </article>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}



