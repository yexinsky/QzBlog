import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'

export const metadata = {
  title: '所有分类 - Qzhou Blog',
  description: '浏览博客中所有的分类。',
}

// 当前项目将「分类」作为高阶分组概念建模于 mock 数据中。
// 当数据模型落地后，这里将自动列出。
const CATEGORIES = [
  { slug: 'frontend', name: '前端开发', description: '前端框架、组件库、设计系统相关。', count: 24 },
  { slug: 'backend', name: '后端技术', description: '服务端、数据库、分布式架构等。', count: 18 },
  { slug: 'devops', name: 'DevOps', description: 'CI/CD、容器化、监控与运维实践。', count: 12 },
  { slug: 'opensource', name: '开源项目', description: '开源项目实践与个人作品展示。', count: 8 },
]

export default function CategoriesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container>
            <PageTitle
              title="所有分类"
              description="按主题浏览文章。"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={'/categories/' + cat.slug}
                  className="block p-6 rounded-card bg-background-base shadow-card hover:shadow-hover transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-xl font-semibold text-text-primary group-hover:text-brand-orange transition-colors">
                      {cat.name}
                    </h2>
                    <span className="text-xs text-text-muted bg-background-hover px-2 py-0.5 rounded">
                      {cat.count} 篇
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{cat.description}</p>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}


