import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'

interface PageProps {
  params: Promise<{ slug: string }>
}

const CATEGORY_MAP: Record<string, { name: string; description: string }> = {
  frontend: { name: '前端开发', description: '前端框架、组件库、设计系统相关。' },
  backend: { name: '后端技术', description: '服务端、数据库、分布式架构等。' },
  devops: { name: 'DevOps', description: 'CI/CD、容器化、监控与运维实践。' },
  opensource: { name: '开源项目', description: '开源项目实践与个人作品展示。' },
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
const cat = CATEGORY_MAP[resolvedParams.slug]
  return {
    title: cat ? cat.name + ' - Qzhou Blog' : '分类未找到 - Qzhou Blog',
    description: cat?.description,
  }
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const resolvedParams = await params
const cat = CATEGORY_MAP[resolvedParams.slug]
  if (!cat) notFound()

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

            <PageTitle title={cat.name} description={cat.description} />

            <div className="bg-background-base rounded-card shadow-card p-12 text-center">
              <p className="text-text-muted mb-4">该分类下还没有文章。</p>
              <p className="text-sm text-text-muted mb-6 max-w-md mx-auto leading-relaxed">
                目前分类是基于主题的高阶分组。请尝试浏览「标签」或「所有文章」查看完整内容。
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/posts"
                  className="px-4 py-2 rounded-button bg-brand-orange text-white text-sm hover:bg-brand-dark transition-colors"
                >
                  浏览所有文章
                </Link>
                <Link
                  href="/tags"
                  className="px-4 py-2 rounded-button border border-border-strong text-text-primary text-sm hover:bg-background-hover transition-colors"
                >
                  浏览标签
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}



