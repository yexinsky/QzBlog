import { notFound } from 'next/navigation'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { Github, ExternalLink, Star, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section } from '@/components/layout/Container'
import { TagCloud } from '@/components/ui/Tag'
import { db, schema } from '@/lib/db'
import { formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getProjectById(id: string) {
  // 项目 id 是 uuid；只接受 uuid 形式并 notFound() 其他
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidLike.test(id)) return null
  return await db.query.projects.findFirst({
    where: eq(schema.projects.id, id),
  })
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const project = await getProjectById(resolvedParams.id)
  if (!project) return { title: '项目未找到 - Qzhou Blog' }
  return {
    title: project.name + ' - Qzhou Blog',
    description: project.description ?? project.name,
  }
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const project = await getProjectById(resolvedParams.id)
  if (!project) notFound()

  const tech = Array.isArray(project.techStack) ? (project.techStack as string[]) : []
  const updatedAt = (project.updatedAt ?? project.createdAt).toISOString()

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container maxWidth="lg">
            <Link
              href="/projects"
              className="inline-flex items-center text-sm text-text-secondary hover:text-brand-orange mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              回到项目列表
            </Link>

            <article className="bg-background-base rounded-card shadow-card overflow-hidden">
              {project.coverImage && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={project.coverImage}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 md:p-8 space-y-6">
                <header>
                  <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="text-lg text-text-secondary leading-relaxed">{project.description}</p>
                  )}
                </header>

                <div className="flex flex-wrap items-center gap-3">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-text-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Github className="w-4 h-4" />
                      查看代码
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-button bg-brand-orange text-white text-sm font-medium hover:bg-brand-dark transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      在线演示
                    </a>
                  )}
                  {(project.starCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-button bg-background-hover text-text-secondary text-sm">
                      <Star className="w-4 h-4" />
                      {project.starCount ?? 0} Star
                    </span>
                  )}
                </div>

                {tech.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
                      技术栈
                    </h2>
                    <TagCloud tags={tech.map((t) => ({ name: t }))} />
                  </div>
                )}

                <div className="text-xs text-text-muted pt-4 border-t border-border">
                  最后更新于 <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
                </div>
              </div>
            </article>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}



