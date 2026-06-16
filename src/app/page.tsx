import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { MainLayout } from '@/components/layout/Layout';
import { Sidebar, ProfileCard, TagCloudSection, RecentPostsSection } from '@/components/layout/Sidebar';
import { ArticleList } from '@/components/article/ArticleList';
import { db, schema } from '@/lib/db';
import { eq, desc, sql } from 'drizzle-orm';

export const revalidate = 60; // 每 60 秒重新验证

export default async function HomePage() {
  try {
    // 获取已发布的文章
    const posts = await db.query.posts.findMany({
      where: eq(schema.posts.status, 'published'),
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        tags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [desc(schema.posts.isPinned), desc(schema.posts.publishedAt)],
      limit: 10,
    });

    // 获取标签列表
    const tags = await db.query.tags.findMany({
      with: {
        posts: {
          columns: {
            postId: true,
          },
        },
      },
    });

    // 格式化文章数据
    const formattedPosts = posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.summary || '',
      coverImage: post.coverImage || '',
      publishedAt: post.publishedAt?.toISOString() || '',
      readingTime: Math.ceil(post.wordCount / 200),
      views: post.viewCount,
      tags: post.tags?.map((pt) => ({
        name: pt.tag.name,
        slug: pt.tag.slug,
      })) || [],
      author: {
        name: post.author?.username || '',
        avatar: post.author?.avatarUrl || '',
      },
    }));

    // 格式化标签数据
    const formattedTags = tags.map((tag) => ({
      name: tag.name,
      slug: tag.slug,
      count: tag.posts?.length || 0,
    }));

    // 获取最近文章
    const recentPosts = posts.slice(0, 5).map((post) => ({
      title: post.title,
      slug: post.slug,
      date: post.publishedAt?.toISOString() || '',
    }));

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
                      avatar: '',
                      tags: [
                        { name: '全栈', href: '/tags/fullstack' },
                        { name: '开源', href: '/tags/opensource' },
                        { name: '分享', href: '/tags/sharing' },
                      ],
                    }}
                  >
                    <TagCloudSection title="标签云" tags={formattedTags} />
                    <RecentPostsSection title="最近文章" posts={recentPosts} />
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
                    <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#E0E0E0] mb-6">最新文章</h2>
                    {formattedPosts.length > 0 ? (
                      <ArticleList articles={formattedPosts} variant="grid" cols={2} />
                    ) : (
                      <div className="text-center py-12 text-[#777777]">
                        <p className="text-lg mb-4">还没有文章</p>
                        <p>开始写第一篇文章吧！</p>
                      </div>
                    )}
                  </div>

                  {/* Categories Quick Access */}
                  <div className="bg-white dark:bg-[#2A2A2A] rounded-12 shadow-sm p-6 border border-[#EBE7E0] dark:border-[#444444]">
                    <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0] mb-4">分类导航</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { name: '前端开发', slug: 'frontend', count: 24 },
                        { name: '后端技术', slug: 'backend', count: 18 },
                        { name: 'DevOps', slug: 'devops', count: 12 },
                        { name: '开源项目', slug: 'opensource', count: 8 },
                      ].map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/categories/${cat.slug}`}
                          className="p-4 rounded-8 bg-[#F0EBE3] dark:bg-[#444444] hover:bg-[#D36F2B] hover:text-white transition-colors group"
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
    );
  } catch (error) {
    console.error('Error loading homepage:', error);
    return (
      <>
        <Header />
        <main className="flex-1">
          <Section>
            <Container>
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#E0E0E0] mb-4">欢迎来到 QzBlog</h1>
                <p className="text-[#777777]">加载中...</p>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </>
    );
  }
}
