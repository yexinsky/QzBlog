import { notFound } from 'next/navigation';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { BookOpen, Calendar, Clock, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';

interface SeriesPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: SeriesPageProps) {
  try {
    const series = await db.query.series.findFirst({
      where: eq(schema.series.slug, params.slug),
      columns: { title: true, description: true, coverImage: true },
    });

    if (!series) {
      return { title: '系列未找到' };
    }

    return {
      title: `${series.title} - QzBlog`,
      description: series.description || `系列文章: ${series.title}`,
      openGraph: {
        title: series.title,
        description: series.description || `系列文章: ${series.title}`,
        images: series.coverImage ? [series.coverImage] : [],
      },
    };
  } catch (error) {
    return { title: 'QzBlog' };
  }
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  try {
    // 获取系列信息
    const seriesData = await db.query.series.findFirst({
      where: eq(schema.series.slug, params.slug),
      with: {
        posts: {
          with: {
            post: {
              columns: {
                id: true,
                title: true,
                slug: true,
                summary: true,
                status: true,
                wordCount: true,
                publishedAt: true,
              },
            },
          },
          orderBy: [asc(schema.seriesPosts.sortOrder)],
        },
      },
    });

    if (!seriesData) {
      notFound();
    }

    // 过滤已发布的文章，按 sortOrder 排序
    const publishedPosts = seriesData.posts
      .filter((sp) => sp.post.status === 'published')
      .map((sp) => ({
        ...sp.post,
        sortOrder: sp.sortOrder,
      }));

    // 统计总字数和总阅读时间
    const totalWordCount = publishedPosts.reduce((acc, post) => acc + (post.wordCount || 0), 0);
    const totalReadingTime = Math.ceil(totalWordCount / 200);

    // 获取相邻系列（用于 prev/next 导航）
    const allSeries = await db.query.series.findMany({
      columns: { slug: true, title: true },
      orderBy: [asc(schema.series.sortOrder)],
    });

    const currentSeriesIndex = allSeries.findIndex((s) => s.slug === seriesData.slug);
    const prevSeries = currentSeriesIndex > 0 ? allSeries[currentSeriesIndex - 1] : null;
    const nextSeries =
      currentSeriesIndex < allSeries.length - 1 ? allSeries[currentSeriesIndex + 1] : null;

    return (
      <div className="min-h-screen bg-background-cream">
        <Header />
        <main className="py-8 md:py-12">
          <Container maxWidth="4xl">
            {/* 系列头部信息 */}
            <div className="mb-10">
              {/* 封面图片 */}
              {seriesData.coverImage && (
                <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8">
                  <Image
                    src={seriesData.coverImage}
                    alt={seriesData.title}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}

              <h1 className="text-3xl md:text-4xl font-bold text-text-primary dark:text-text-primary mb-4">
                {seriesData.title}
              </h1>

              {seriesData.description && (
                <p className="text-lg text-text-secondary dark:text-text-secondary leading-relaxed mb-6">
                  {seriesData.description}
                </p>
              )}

              {/* 统计信息 */}
              <div className="flex flex-wrap items-center gap-5 text-sm text-text-muted dark:text-text-muted">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>
                    共 {publishedPosts.length} 篇文章
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    总计 {totalWordCount.toLocaleString()} 字
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>
                    约 {totalReadingTime} 分钟阅读
                  </span>
                </div>
              </div>
            </div>

            {/* 文章列表 */}
            {publishedPosts.length > 0 ? (
              <div className="space-y-4">
                {publishedPosts.map((post, index) => (
                  <Link key={post.id} href={`/posts/${post.slug}`} className="block group">
                    <Card hover>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* 序号 */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background-hover dark:bg-background-hover flex items-center justify-center text-text-secondary dark:text-text-primary font-semibold text-sm group-hover:bg-[#D36F2B] group-hover:text-white transition-colors">
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary group-hover:text-[#D36F2B] transition-colors truncate">
                              {post.title}
                            </h2>

                            {post.summary && (
                              <p className="mt-1.5 text-sm text-text-muted dark:text-text-muted line-clamp-2">
                                {post.summary}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-text-muted dark:text-text-muted">
                              {post.publishedAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDate(post.publishedAt)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>
                                  {(post.wordCount || 0).toLocaleString()} 字
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{Math.ceil((post.wordCount || 0) / 200)} 分钟阅读</span>
                              </div>
                            </div>
                          </div>

                          {/* 阅读进度指示 */}
                          <div className="flex-shrink-0 text-text-muted dark:text-text-muted group-hover:text-[#D36F2B] transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 mx-auto text-border dark:text-border-strong mb-4" />
                <p className="text-lg text-text-muted dark:text-text-muted">
                  该系列暂无已发布的文章
                </p>
              </div>
            )}

            {/* 系列导航: 上一个 / 下一个系列 */}
            {(prevSeries || nextSeries) && (
              <div className="mt-12 pt-8 border-t border-border dark:border-border-strong">
                <div className="flex items-center justify-between gap-4">
                  {prevSeries ? (
                    <Link
                      href={`/series/${prevSeries.slug}`}
                      className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary hover:text-[#D36F2B] dark:hover:text-[#D36F2B] transition-colors group"
                    >
                      <ChevronLeft className="w-4 h-4 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                      <div className="min-w-0">
                        <div className="text-xs text-text-muted dark:text-text-muted">上一个系列</div>
                        <div className="font-medium truncate">{prevSeries.title}</div>
                      </div>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {nextSeries ? (
                    <Link
                      href={`/series/${nextSeries.slug}`}
                      className="flex items-center gap-2 text-sm text-text-secondary dark:text-text-secondary hover:text-[#D36F2B] dark:hover:text-[#D36F2B] transition-colors group text-right"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-text-muted dark:text-text-muted">下一个系列</div>
                        <div className="font-medium truncate">{nextSeries.title}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            )}
          </Container>
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('Error loading series page:', error);
    notFound();
  }
}
