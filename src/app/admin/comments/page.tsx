'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  MessageSquare,
  Check,
  X,
  Trash2,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string;
  contentMd: string;
  contentHtml: string;
  status: 'pending' | 'approved' | 'rejected';
  isPinned: boolean;
  depth: number;
  createdAt: string;
  postTitle: string | null;
  postSlug: string | null;
}

interface CommentCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [counts, setCounts] = useState<CommentCounts>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchComments = useCallback(async (status?: FilterStatus) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (status && status !== 'all') {
        params.set('status', status);
      }
      params.set('limit', '100');

      const response = await fetch(`/api/admin/comments?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        setCounts(data.counts || { all: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments(activeFilter);
  }, [activeFilter, fetchComments]);

  const handleStatusChange = async (commentId: string, newStatus: 'approved' | 'rejected') => {
    setActionLoading(commentId);
    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // 更新本地状态
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, status: newStatus } : c
          )
        );
        // 重新获取计数
        fetchComments(activeFilter);
      } else {
        alert('操作失败，请重试');
      }
    } catch (error) {
      console.error('Failed to update comment status:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？此操作不可撤销。')) {
      return;
    }

    setActionLoading(commentId);
    try {
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        fetchComments(activeFilter);
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('删除失败，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 30) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const statusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: counts.all },
    { key: 'pending', label: '待审核', count: counts.pending },
    { key: 'approved', label: '已通过', count: counts.approved },
    { key: 'rejected', label: '已拒绝', count: counts.rejected },
  ];

  return (
    <div className="flex min-h-screen bg-background-cream">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <Container maxWidth="full">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary">
                评论管理
              </h1>
              {counts.pending > 0 && (
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-bold text-white bg-red-500 rounded-full">
                  {counts.pending}
                </span>
              )}
            </div>
            <p className="text-text-muted">审核和管理用户评论</p>
          </div>

          {/* Filter Tabs */}
          <Card className="mb-6">
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-text-muted mr-1" />
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFilter === tab.key
                        ? 'bg-[#D36F2B] text-white'
                        : 'bg-border dark:bg-background-base text-text-secondary dark:text-text-primary hover:bg-border-strong dark:hover:bg-background-hover'
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs rounded-full ${
                        activeFilter === tab.key
                          ? 'bg-white/20 text-white'
                          : tab.key === 'pending' && tab.count > 0
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-border-strong dark:bg-background-hover text-text-muted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}

                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchComments(activeFilter)}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Table */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">
                评论列表 ({counts[activeFilter]})
              </h2>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-text-muted">加载中...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-border-strong dark:text-text-secondary" />
                  <p className="text-lg mb-2">暂无评论</p>
                  <p>
                    {activeFilter === 'all'
                      ? '还没有收到任何评论'
                      : `没有${activeFilter === 'pending' ? '待审核' : activeFilter === 'approved' ? '已通过' : '已拒绝'}的评论`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-border-strong">
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                          评论者
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                          内容
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                          文章
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                          状态
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                          时间
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {comments.map((comment) => (
                        <tr
                          key={comment.id}
                          className="border-b border-border dark:border-border-strong last:border-b-0 hover:bg-background-hover dark:hover:bg-background-base transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-text-primary dark:text-text-primary text-sm">
                                {comment.authorName}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">
                                {comment.authorEmail}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="max-w-xs">
                              <p className="text-sm text-text-secondary dark:text-text-primary line-clamp-2">
                                {comment.contentMd}
                              </p>
                              {comment.depth > 0 && (
                                <span className="inline-block mt-1 text-xs text-text-muted bg-border dark:bg-background-base px-1.5 py-0.5 rounded">
                                  回复
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {comment.postTitle ? (
                              <a
                                href={`/posts/${comment.postSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#D36F2B] hover:underline line-clamp-1"
                              >
                                {comment.postTitle}
                              </a>
                            ) : (
                              <span className="text-sm text-text-muted">已删除的文章</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {statusBadge(comment.status)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1 text-sm text-text-muted">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(comment.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-1">
                              {comment.status !== 'approved' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(comment.id, 'approved')}
                                  disabled={actionLoading === comment.id}
                                  title="通过"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                              )}
                              {comment.status !== 'rejected' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(comment.id, 'rejected')}
                                  disabled={actionLoading === comment.id}
                                  title="拒绝"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(comment.id)}
                                disabled={actionLoading === comment.id}
                                title="删除"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
