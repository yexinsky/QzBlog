'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Edit, Trash2, Eye, Calendar, Search } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'scheduled';
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts?status=all');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts(posts.filter(post => post.id !== id));
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('删除失败，请重试');
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">已发布</span>;
      case 'draft':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">草稿</span>;
      case 'scheduled':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">定时发布</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F1EA] dark:bg-[#1E1E1E]">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <Container maxWidth="full">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#E0E0E0] mb-2">文章管理</h1>
              <p className="text-[#777777]">管理您的所有文章</p>
            </div>
            <Link href="/admin/posts/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                新建文章
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#777777]" />
                  <input
                    type="text"
                    placeholder="搜索文章标题..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B]"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B]"
                >
                  <option value="all">全部状态</option>
                  <option value="published">已发布</option>
                  <option value="draft">草稿</option>
                  <option value="scheduled">定时发布</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Posts List */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">
                文章列表 ({filteredPosts.length})
              </h2>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-[#777777]">加载中...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#777777] mb-4">暂无文章</p>
                  <Link href="/admin/posts/new">
                    <Button>创建第一篇文章</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#EBE7E0] dark:border-[#444444]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#777777]">标题</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#777777]">状态</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#777777]">阅读量</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#777777]">点赞数</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#777777]">发布时间</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[#777777]">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPosts.map((post) => (
                        <tr key={post.id} className="border-b border-[#EBE7E0] dark:border-[#444444] last:border-0 hover:bg-[#F0EBE3] dark:hover:bg-[#2A2A2A]">
                          <td className="py-3 px-4">
                            <Link href={`/posts/${post.slug}`} target="_blank" className="text-sm font-medium text-[#1A1A1A] dark:text-[#E0E0E0] hover:text-[#D36F2B]">
                              {post.title}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(post.status)}
                          </td>
                          <td className="py-3 px-4 text-sm text-[#444444] dark:text-[#E0E0E0]">
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {post.viewCount}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#444444] dark:text-[#E0E0E0]">
                            {post.likeCount}
                          </td>
                          <td className="py-3 px-4 text-sm text-[#777777]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('zh-CN') : '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/posts/${post.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(post.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </Container>
      </main>
    </div>
  );
}
