import { notFound } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { Calendar, Eye, Heart, Clock, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TableOfContents } from '@/components/article/TableOfContents';
import { extractToc } from '@/lib/markdown';
import { CommentSection } from '@/components/comments/CommentSection';
import { LikeButton } from '@/components/article/LikeButton';
import { ShareButtons } from '@/components/article/ShareButtons';

interface PostPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  try {
    const posts = await db.query.posts.findMany({
      where: eq(schema.posts.status, 'published'),
      columns: { slug: true },
    });
    return posts.map((post) => ({ slug: post.slug }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: PostPageProps) {
  try {
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.slug, params.slug),
      columns: { title: true, summary: true, coverImage: true },
    });

    if (!post) {
      return { title: '文章未找到' };
    }

    return {
      title: `${post.title} - QzBlog`,
      description: post.summary,
      openGraph: {
        title: post.title,
        description: post.summary,
        images: post.coverImage ? [post.coverImage] : [],
      },
    };
  } catch (error) {
    return { title: 'QzBlog' };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  try {
    const post = await db.query.posts.findFirst({
      where: eq(schema.posts.slug, params.slug),
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
        tags: {
          with: {
            tag: true,
          },
        },
        seriesPost: {
          with: {
            series: true,
          },
        },
      },
    });

    if (!post || post.status !== 'published') {
      notFound();
    }

    // 获取系列中的上一篇和下一篇
    let prevPost = null;
    let nextPost = null;

    if (post.seriesPost?.[0]?.series) {
      const seriesId = post.seriesPost[0].seriesId;
      const seriesPosts = await db.query.seriesPosts.findMany({
        where: eq(schema.seriesPosts.seriesId, seriesId),
        with: {
          post: {
            columns: { id: true, title: true, slug: true },
          },
        },
        orderBy: schema.seriesPosts.sortOrder,
      });

      const currentIndex = seriesPosts.findIndex((sp) => sp.postId === post.id);
      if (currentIndex > 0) {
        prevPost = seriesPosts[currentIndex - 1].post;
      }
      if (currentIndex < seriesPosts.length - 1) {
        nextPost = seriesPosts[currentIndex + 1].post;
      }
    }

    // 提取目录
    const toc = extractToc(post.contentMd);

    // 更新阅读量
    await db
      .update(schema.posts)
      .set({ viewCount: post.viewCount + 1 })
      .where(eq(schema.posts.id, post.id));

    return (
      <div className="min-h-screen bg-background-cream">
        <Header />
        <main className="py-8">
          <Container maxWidth="4xl">
            <article>
              {/* 文章头部 */}
              <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-text-primary mb-4">
                  {post.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{post.viewCount} 阅读</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    <span>{post.likeCount} 点赞</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{Math.ceil(post.wordCount / 200)} 分钟阅读</span>
                  </div>
                </div>

                {/* 标签 */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {post.tags.map((pt) => (
                      <Link
                        key={pt.tag.id}
                        href={`/tags/${pt.tag.slug}`}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-background-hover dark:bg-background-hover text-text-secondary dark:text-text-primary rounded-full hover:bg-[#D36F2B] hover:text-white transition-colors"
                      >
                        <Tag className="w-3 h-3" />
                        {pt.tag.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* 系列导航 */}
                {post.seriesPost?.[0]?.series && (
                  <div className="mt-6 p-4 bg-background-base dark:bg-background-base rounded-12 border-border dark:border-border-strong">
                    <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
                      <span>📂</span>
                      <span>系列: {post.seriesPost[0].series.title}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {prevPost ? (
                        <Link
                          href={`/posts/${prevPost.slug}`}
                          className="flex items-center gap-2 text-sm text-[#D36F2B] hover:underline"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          {prevPost.title}
                        </Link>
                      ) : (
                        <div />
                      )}
                      {nextPost ? (
                        <Link
                          href={`/posts/${nextPost.slug}`}
                          className="flex items-center gap-2 text-sm text-[#D36F2B] hover:underline"
                        >
                          {nextPost.title}
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <div />
                      )}
                    </div>
                  </div>
                )}
              </header>

              <div className="flex gap-8">
                {/* 文章目录（桌面端固定） */}
                {toc.length > 0 && (
                  <aside className="hidden lg:block w-64 flex-shrink-0">
                    <div className="sticky top-8">
                      <TableOfContents items={toc} />
                    </div>
                  </aside>
                )}

                {/* 文章正文 */}
                <div className="flex-1 min-w-0">
                  <Card>
                    <CardContent className="p-8">
                      <div
                        className="prose prose-lg max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
                      />
                    </CardContent>
                  </Card>

                  {/* 文章底部操作 */}
                  <div className="mt-8 flex items-center justify-between">
                    <LikeButton postId={post.id} initialCount={post.likeCount} />
                    <ShareButtons title={post.title} slug={post.slug} />
                  </div>

                  {/* 作者信息 */}
                  {post.author && (
                    <div className="mt-8 p-6 bg-background-base dark:bg-background-base rounded-12 border-border dark:border-border-strong">
                      <div className="flex items-center gap-4">
                        {post.author.avatarUrl && (
                          <img
                            src={post.author.avatarUrl}
                            alt={post.author.username}
                            className="w-16 h-16 rounded-full"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-text-primary dark:text-text-primary">
                            {post.author.username}
                          </h3>
                          {post.author.bio && (
                            <p className="text-sm text-text-muted mt-1">{post.author.bio}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 评论区 */}
                  <div className="mt-8">
                    <CommentSection postId={post.id} />
                  </div>
                </div>
              </div>
            </article>
          </Container>
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('Error loading post:', error);
    notFound();
  }
}
