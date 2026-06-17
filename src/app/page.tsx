import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { MainLayout } from '@/components/layout/Layout';
import { Sidebar, ProfileCard, TagCloudSection, RecentPostsSection } from '@/components/layout/Sidebar';
import { ArticleList } from '@/components/article/ArticleList';
import { db, schema } from '@/lib/db';
import { eq, desc, sql, count } from 'drizzle-orm';

export const revalidate = 60; // 每 60 秒重新验证

const PAGE_SIZE = 10;

export default async function HomePage({ searchParams }: { searchParams?: { page?: string } }) {
  try {
    const currentPage = Math.max(1, parseInt(searchParams?.page || '1'));
    const offset = (currentPage - 1) * PAGE_SIZE;

    // 获取已发布的文章总数
    const totalResult = await db
      .select({ count: count() })
      .from(schema.posts)
      .where(eq(schema.posts.status, 'published'));
    const totalPosts = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(totalPosts / PAGE_SIZE);

    // 获取已发布的文章（分页）
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
      limit: PAGE_SIZE,
      offset,
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

    // 获取站点设置用于侧边栏个人信息
    const settings = await db.query.siteSettings.findFirst();

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
                      name: settings?.siteName || 'Qzhou',
                      bio: settings?.bio || '这个人很懒，什么都没写',
                      avatar: settings?.avatarUrl || '',
                      tags: formattedTags.slice(0, 5).map(t => ({ name: t.name, href: `/tags/${t.slug}` })),
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
                    <h2 className="text-2xl font-bold text-text-primary dark:text-text-primary mb-6">最新文章</h2>
                    {formattedPosts.length > 0 ? (
                      <>
                        <ArticleList articles={formattedPosts} variant="grid" cols={2} />
                        {/* 分页 */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-8">
                            {currentPage > 1 && (
                              <Link
                                href={`/?page=${currentPage - 1}`}
                                className="px-4 py-2 text-sm border border-border dark:border-border-strong rounded-lg hover:bg-background-hover dark:hover:bg-background-hover transition-colors"
                              >
                                上一页
                              </Link>
                            )}
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <Link
                                key={page}
                                href={`/?page=${page}`}
                                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                                  page === currentPage
                                    ? 'bg-brand-orange text-white'
                                    : 'border border-border dark:border-border-strong hover:bg-background-hover dark:hover:bg-background-hover'
                                }`}
                              >
                                {page}
                              </Link>
                            ))}
                            {currentPage < totalPages && (
                              <Link
                                href={`/?page=${currentPage + 1}`}
                                className="px-4 py-2 text-sm border border-border dark:border-border-strong rounded-lg hover:bg-background-hover dark:hover:bg-background-hover transition-colors"
                              >
                                下一页
                              </Link>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12 text-text-muted">
                        <p className="text-lg mb-4">还没有文章</p>
                        <p>开始写第一篇文章吧！</p>
                      </div>
                    )}
                  </div>

                  {/* Categories Quick Access */}
                  {formattedTags.length > 0 && (
                    <div className="bg-background-base dark:bg-background-base rounded-12 shadow-sm p-6 border border-border dark:border-border-strong">
                      <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary mb-4">标签云</h3>
                      <div className="flex flex-wrap gap-2">
                        {formattedTags.map((tag) => (
                          <Link
                            key={tag.slug}
                            href={`/tags/${tag.slug}`}
                            className="px-4 py-2 rounded-8 bg-background-hover dark:bg-background-hover hover:bg-brand-orange hover:text-white transition-colors group"
                          >
                            <span className="font-medium">{tag.name}</span>
                            <span className="text-sm opacity-60 ml-1">({tag.count})</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
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
                <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary mb-4">欢迎来到 QzBlog</h1>
                <p className="text-text-muted">加载中...</p>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </>
    );
  }
}
