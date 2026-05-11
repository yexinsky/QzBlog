import React from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section } from '@/components/layout/Container'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, MessageSquare, Eye, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Mock data
const stats = [
  { label: '文章总数', value: '48', icon: FileText, change: '+3 本月' },
  { label: '评论数', value: '156', icon: MessageSquare, change: '+12 本周' },
  { label: '总阅读量', value: '12.3k', icon: Eye, change: '+8%' },
  { label: '文章增长', value: '12%', icon: TrendingUp, change: '较上月' },
]

const recentPosts = [
  { title: 'Next.js 14 App Router 完全指南', date: '2024-01-15', views: 234, status: '已发布' },
  { title: 'Tailwind CSS 最佳实践', date: '2024-01-10', views: 189, status: '已发布' },
  { title: 'TypeScript 高级类型技巧', date: '2024-01-05', views: 156, status: '已发布' },
  { title: 'Node.js 性能优化指南', date: '2024-01-01', views: 123, status: '草稿' },
]

const recentComments = [
  { author: '访客A', content: '非常好的文章，学到了很多！', date: '2024-01-15' },
  { author: '访客B', content: '请问如何实现这个功能？', date: '2024-01-14' },
  { author: '访客C', content: '感谢博主的分享！', date: '2024-01-13' },
]

export default function AdminDashboard() {
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
                      <p className="text-sm text-green-600 mt-1">{stat.change}</p>
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
                <div className="space-y-4">
                  {recentPosts.map((post, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{post.title}</p>
                        <div className="flex items-center space-x-2 text-xs text-text-muted mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{post.date}</span>
                          <span>•</span>
                          <Eye className="w-3 h-3" />
                          <span>{post.views}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${post.status === '已发布' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {post.status}
                      </span>
                    </div>
                  ))}
                </div>
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
                <div className="space-y-4">
                  {recentComments.map((comment, index) => (
                    <div key={index} className="py-2 border-b border-border last:border-0">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {comment.author[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-text-primary">{comment.author}</p>
                            <span className="text-xs text-text-muted">{comment.date}</span>
                          </div>
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  )
}