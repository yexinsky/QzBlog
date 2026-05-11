import React from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section, PageTitle } from '@/components/layout/Container'
import { MainLayout } from '@/components/layout/Layout'
import { Sidebar, ProfileCard, TagCloudSection, RecentPostsSection } from '@/components/layout/Sidebar'
import { ArticleList } from '@/components/article/ArticleList'

// Mock data
const mockArticles = [
  {
    slug: 'getting-started-nextjs',
    title: 'Next.js 14 App Router 完全指南',
    excerpt: '探索 Next.js 14 的 App Router 架构，学习如何使用服务端组件、布局和路由处理。',
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
    publishedAt: '2024-01-15',
    readingTime: 8,
    views: 1234,
    tags: [
      { name: 'Next.js', slug: 'nextjs' },
      { name: 'React', slug: 'react' },
    ],
    author: { name: 'Qzhou', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }
  },
  {
    slug: 'tailwindcss-best-practices',
    title: 'Tailwind CSS 最佳实践',
    excerpt: '掌握 Tailwind CSS 的核心概念，学习如何构建可维护的设计系统。',
    coverImage: 'https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=800',
    publishedAt: '2024-01-10',
    readingTime: 6,
    views: 856,
    tags: [
      { name: 'CSS', slug: 'css' },
      { name: 'Tailwind', slug: 'tailwind' },
    ],
    author: { name: 'Qzhou', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }
  },
  {
    slug: 'typescript-advanced-patterns',
    title: 'TypeScript 高级类型技巧',
    excerpt: '深入理解 TypeScript 的类型系统，学习条件类型、映射类型等高级模式。',
    coverImage: 'https://images.unsplash.com/photo-1516116216624-53e69d1ef5e7?w=800',
    publishedAt: '2024-01-05',
    readingTime: 10,
    views: 967,
    tags: [
      { name: 'TypeScript', slug: 'typescript' },
    ],
    author: { name: 'Qzhou', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }
  }
]

const mockTags = [
  { name: 'Next.js', slug: 'nextjs', count: 12 },
  { name: 'React', slug: 'react', count: 8 },
  { name: 'TypeScript', slug: 'typescript', count: 15 },
  { name: 'Tailwind', slug: 'tailwind', count: 6 },
  { name: 'Node.js', slug: 'nodejs', count: 10 },
  { name: 'Docker', slug: 'docker', count: 4 },
]

const mockRecentPosts = [
  { title: 'Next.js 14 App Router 完全指南', slug: 'getting-started-nextjs', date: '2024-01-15' },
  { title: 'Tailwind CSS 最佳实践', slug: 'tailwindcss-best-practices', date: '2024-01-10' },
  { title: 'TypeScript 高级类型技巧', slug: 'typescript-advanced-patterns', date: '2024-01-05' },
]

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container>
            <MainLayout
              sidebar={
                <Sidebar
                  showProfile
                  profileCard={{
                    name: 'Qzhou',
                    bio: '全栈开发工程师，热爱技术，喜欢分享。专注于 Web 开发、前端架构和开源项目。',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
                    tags: [
                      { name: '全栈', href: '/tags/fullstack' },
                      { name: '开源', href: '/tags/opensource' },
                      { name: '分享', href: '/tags/sharing' }
                    ]
                  }}
                >
                  <TagCloudSection title="标签云" tags={mockTags} />
                  <RecentPostsSection title="最近文章" posts={mockRecentPosts} />
                </Sidebar>
              }
            >
              <div className="space-y-8">
                <PageTitle
                  title="技术博客"
                  description="分享技术心得，记录成长历程"
                />

                {/* Featured Section */}
                <div>
                  <h2 className="text-2xl font-bold text-text-primary mb-6">最新文章</h2>
                  <ArticleList articles={mockArticles} variant="grid" cols={2} />
                </div>

                {/* Categories Quick Access */}
                <div className="bg-background-base rounded-card shadow-card p-6">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">分类导航</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: '前端开发', slug: 'frontend', count: 24 },
                      { name: '后端技术', slug: 'backend', count: 18 },
                      { name: 'DevOps', slug: 'devops', count: 12 },
                      { name: '开源项目', slug: 'opensource', count: 8 },
                    ].map(cat => (
                      <Link
                        key={cat.slug}
                        href={`/categories/${cat.slug}`}
                        className="p-4 rounded-button bg-background-hover hover:bg-brand-orange hover:text-white transition-colors group"
                      >
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-sm opacity-60">{cat.count} 篇文章</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </MainLayout>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}