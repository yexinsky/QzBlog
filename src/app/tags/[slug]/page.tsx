import { notFound } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { MainLayout } from '@/components/layout/Layout';
import { Sidebar, TagCloudSection, RecentPostsSection } from '@/components/layout/Sidebar';
import { ArticleList } from '@/components/article/ArticleList';

interface TagPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: TagPageProps) {
  try {
    const tag = await db.query.tags.findFirst({
      where: eq(schema.tags.slug, params.slug),
      columns: { name: true },
    });

    if (!tag) {
      return { title: '标签未找到' };
    }

    return {
      title: `${tag.name} - QzBlog`,
      description: `查看所有关于 ${tag.name} 的文章`,
    };
  } catch (error) {
    return { title: 'QzBlog' };
  }
}

export default async function TagPage({ params }: TagPageProps) {
  try {
    // 获取标签信息
    const tag = await db.query.tags.findFirst({
      where: eq(schema.tags.slug, params.slug),
    });

    if (!tag) {
      notFound();
    }

    // 获取该标签下的文章
    const posts = await db.query.postTags.findMany({
      where: eq(schema.postTags.tagId, tag.id),
      with: {
        post: {
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
        },
      },
    });

    // 过滤已发布的文章
    const publishedPosts = posts
      .filter((pt) => pt.post.status === 'published')
      .map((pt) => pt.post)
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });

    // 格式化文章数据
    const formattedPosts = publishedPosts.map((post) => ({
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

    // 获取所有标签
    const allTags = await db.query.tags.findMany({
      with: {
        posts: {
          columns: {
            postId: true,
          },
        },
      },
    });

    const formattedTags = allTags.map((t) => ({
      name: t.name,
      slug: t.slug,
      count: t.posts?.length || 0,
    }));

    // 获取最近文章
    const recentPosts = publishedPosts.slice(0, 5).map((post) => ({
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
                  <Sidebar>
                    <TagCloudSection title="标签云" tags={formattedTags} />
                    <RecentPostsSection title="最近文章" posts={recentPosts} />
                  </Sidebar>
                }
              >
                <div className="space-y-8">
                  <PageTitle
                    title={`标签: ${tag.name}`}
                    description={`共 ${formattedPosts.length} 篇文章`}
                  />

                  {formattedPosts.length > 0 ? (
                    <ArticleList articles={formattedPosts} variant="list" />
                  ) : (
                    <div className="text-center py-12 text-[#777777]">
                      <p className="text-lg mb-4">该标签下暂无文章</p>
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
    console.error('Error loading tag page:', error);
    notFound();
  }
}
