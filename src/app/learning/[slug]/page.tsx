import { notFound } from 'next/navigation'
import Link from 'next/link'
import { eq, desc } from 'drizzle-orm'
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'
import { db, schema } from '@/lib/db'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getPathBySlug(slug: string) {
  return await db.query.learningPaths.findFirst({
    where: eq(schema.learningPaths.slug, slug),
    with: {
      nodes: {
        orderBy: [desc(schema.learningNodes.sortOrder)],
        with: {
          post: { columns: { id: true, title: true, slug: true } },
        },
      },
    },
  })
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const path = await getPathBySlug(resolvedParams.slug)
  if (!path) return { title: '学习路线未找到 - Qzhou Blog' }
  return {
    title: path.title + ' - Qzhou Blog',
    description: path.description ?? path.title,
  }
}

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  completed: {
    label: '已完成',
    icon: CheckCircle2,
    className: 'text-green-600',
  },
  learning: {
    label: '学习中',
    icon: Loader2,
    className: 'text-brand-orange',
  },
  planned: {
    label: '计划中',
    icon: Circle,
    className: 'text-text-muted',
  },
}

export default async function LearningPathDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const path = await getPathBySlug(resolvedParams.slug)
  if (!path) notFound()

  const nodes = path.nodes || []
  const completed = nodes.filter((n) => n.status === 'completed').length
  const progress = nodes.length > 0 ? Math.round((completed / nodes.length) * 100) : 0

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container>
            <Link
              href="/learning"
              className="inline-flex items-center text-sm text-text-secondary hover:text-brand-orange mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              回到学习路线
            </Link>

            <PageTitle
              title={path.title}
              description={path.description ?? undefined}
            />

            <div className="bg-background-base rounded-card shadow-card p-6 mb-8">
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-2 text-text-secondary">
                  <BookOpen className="w-4 h-4" />
                  <span>整体进度</span>
                </div>
                <span className="text-text-primary font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-background-hover rounded-full h-3 overflow-hidden">
                <div
                  className="bg-brand-orange h-full transition-all"
                  style={{ width: progress + '%' }}
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted pt-3">
                <span>已完成 {completed}</span>
                <span>·</span>
                <span>总计 {nodes.length}</span>
              </div>
            </div>

            {nodes.length === 0 ? (
              <div className="bg-background-base rounded-card shadow-card p-12 text-center">
                <p className="text-text-muted">此路线还没有添加节点。</p>
              </div>
            ) : (
              <ol className="space-y-3">
                {nodes.map((node, idx) => {
                  const meta = STATUS_META[node.status] ?? STATUS_META.planned
                  const Icon = meta.icon
                  return (
                    <li
                      key={node.id}
                      className="bg-background-base rounded-card shadow-card p-4 flex items-start gap-4"
                    >
                      <span className={`shrink-0 mt-1 ${meta.className}`}>
                        <Icon className={`w-5 h-5 ${node.status === 'learning' ? 'animate-spin' : ''}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs text-text-muted">{idx + 1}.</span>
                          <h3 className="font-medium text-text-primary">{node.title}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${meta.className} bg-background-hover`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        {node.description && (
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {node.description}
                          </p>
                        )}
                        {node.post && (
                          <Link
                            href={'/posts/' + node.post.slug}
                            className="inline-block mt-2 text-xs text-brand-orange hover:underline"
                          >
                            相关阅读：{node.post.title} →
                          </Link>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}



