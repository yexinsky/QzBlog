import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section } from '@/components/layout/Container'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, MessageSquare, Eye, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { db, schema } from '@/lib/db'
import { eq, desc, sql, count } from 'drizzle-orm'
import { formatDistanceToNow } from '@/lib/utils'

// 跳过静态生成，构建时不需要数据库连接
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  // 获取文章统计
  const [postsCountResult] = await db
    .select({ count: count() })
    .from(schema.posts)
    .where(eq(schema.posts.status, 'published'))
  const postsCount = postsCountResult?.count || 0

  // 获取草稿数量
  const [draftsCountResult] = await db
    .select({ count: count() })
    .from(schema.posts)
    .where(eq(schema.posts.status, 'draft'))
  const draftsCount = draftsCountResult?.count || 0

  // 获取评论统计
  const [commentsCountResult] = await db
    .select({ count: count() })
    .from(schema.comments)
  const commentsCount = commentsCountResult?.count || 0

  // 获取待审核评论
  const [pendingCommentsCountResult] = await db
    .select({ count: count() })
    .from(schema.comments)
    .where(eq(schema.comments.status, 'pending'))
  const pendingCommentsCount = pendingCommentsCountResult?.count || 0

  // 获取总阅读量
  const [totalViewsResult] = await db
    .select({ total: sql<number>`sum(${schema.posts.viewCount})` })
    .from(schema.posts)
  const totalViews = totalViewsResult?.total || 0

  // 获取最近发布的文章
  const recentPosts = await db.query.posts.findMany({
    where: eq(schema.posts.status, 'published'),
    orderBy: [desc(schema.posts.publishedAt)],
    limit: 5,
    columns: {
      title: true,
      slug: true,
      publishedAt: true,
      viewCount: true,
      status: true,
    },
  })

  // 获取最近评论
  const recentComments = await db.query.comments.findMany({
    orderBy: [desc(schema.comments.createdAt)],
    limit: 5,
    columns: {
      id: true,
      authorName: true,
      contentMd: true,
      createdAt: true,
    },
  })

  // 计算本月新增文章数（简单估算：最近30天发布的）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentPublishedPosts = await db
    .select({ count: count() })
    .from(schema.posts)
    .where(eq(schema.posts.status, 'published'))

  const stats = [
    {
      label: '文章总数',
      value: postsCount.toString(),
      icon: FileText,
      subtext: `${draftsCount} 篇草稿`,
    },
    {
      label: '评论数',
      value: commentsCount.toString(),
      icon: MessageSquare,
      subtext: `${pendingCommentsCount} 待审核`,
    },
    {
      label: '总阅读量',
      value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews.toString(),
      icon: Eye,
      subtext: '累计访问',
    },
    {
      label: '本月更新',
      value: recentPublishedPosts[0]?.count?.toString() || '0',
      icon: TrendingUp,
      subtext: '发布文章',
    },
  ]

  return (
    <div className="flex min-h-screen bg-background-cream">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <Container maxWidth="full">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">仪表盘</h1>
            <p className="text-text-secondary">欢迎回来！以下是您的博客概览。</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-muted mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-text-primary">{stat.value}</p>
                      <p className="text-sm text-text-muted mt-1">{stat.subtext}</p>
                    </div>
                    <div className="w-12 h-12 bg-brand-orange/10 rounded-lg flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-brand-orange" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Posts */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">最近文章</h2>
                <Link href="/admin/posts">
                  <Button variant="ghost" size="sm">
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentPosts.length > 0 ? (
                  <div className="space-y-4">
                    {recentPosts.map((post) => (
                      <div key={post.slug} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{post.title}</p>
                          <div className="flex items-center space-x-2 text-xs text-text-muted mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{post.publishedAt ? formatDistanceToNow(post.publishedAt) : '未发布'}</span>
                            <span>•</span>
                            <Eye className="w-3 h-3" />
                            <span>{post.viewCount || 0}</span>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${post.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                          {post.status === 'published' ? '已发布' : '草稿'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-center py-8">暂无文章</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Comments */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">最近评论</h2>
                <Link href="/admin/comments">
                  <Button variant="ghost" size="sm">
                    查看全部
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentComments.length > 0 ? (
                  <div className="space-y-4">
                    {recentComments.map((comment) => (
                      <div key={comment.id} className="py-2 border-b border-border last:border-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {comment.authorName?.[0] || '匿'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-text-primary">{comment.authorName || '匿名用户'}</p>
                              <span className="text-xs text-text-muted">{comment.createdAt ? formatDistanceToNow(comment.createdAt) : ''}</span>
                            </div>
                            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{comment.contentMd}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted text-center py-8">暂无评论</p>
                )}
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  )
}
