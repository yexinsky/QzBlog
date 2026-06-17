'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Heart, Clock, Image as ImageIcon } from 'lucide-react';

interface Moment {
  id: string;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  publishedAt: string;
  createdAt: string;
}

export default function AdminMomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    try {
      const response = await fetch('/api/moments?limit=50');
      if (response.ok) {
        const data = await response.json();
        setMoments(data.moments || []);
      }
    } catch (error) {
      console.error('Failed to fetch moments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!newContent.trim()) {
      alert('请输入动态内容');
      return;
    }

    if (newContent.length > 500) {
      alert('动态内容不能超过 500 字');
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent,
          imageUrl: newImageUrl || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMoments((prev) => [data, ...prev]);
        setNewContent('');
        setNewImageUrl('');
        alert('动态已发布');
      } else {
        alert('发布失败，请重试');
      }
    } catch (error) {
      console.error('Publish failed:', error);
      alert('发布失败，请重试');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条动态吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/moments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMoments(moments.filter((m) => m.id !== id));
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('删除失败，请重试');
    }
  };

  const formatRelativeTime = (dateString: string) => {
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
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex min-h-screen bg-background-cream">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <Container maxWidth="full">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary mb-2">动态管理</h1>
            <p className="text-text-muted">发布和管理动态</p>
          </div>

          {/* Publish Form */}
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">发布新动态</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-2">
                    动态内容（最多 500 字）
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="分享你的想法..."
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 border border-border-strong dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] resize-none"
                  />
                  <div className="text-right text-sm text-text-muted mt-1">
                    {newContent.length}/500
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-2">
                    图片链接（可选）
                  </label>
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 border border-border-strong dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B]"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handlePublish} disabled={isPublishing}>
                    <Plus className="w-4 h-4 mr-2" />
                    {isPublishing ? '发布中...' : '发布动态'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Moments List */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">
                动态列表 ({moments.length})
              </h2>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-text-muted">加载中...</div>
              ) : moments.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <p className="text-lg mb-4">暂无动态</p>
                  <p>发布第一条动态吧！</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {moments.map((moment) => (
                    <div
                      key={moment.id}
                      className="p-4 border border-border dark:border-border-strong rounded-8 hover:bg-background-hover dark:hover:bg-background-base transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-secondary dark:text-text-primary mb-2 whitespace-pre-wrap">
                            {moment.content}
                          </p>
                          {moment.imageUrl && (
                            <div className="mb-2">
                              <img
                                src={moment.imageUrl}
                                alt="动态图片"
                                className="max-w-xs rounded-8 max-h-48 object-cover"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-text-muted">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatRelativeTime(moment.publishedAt)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              <span>{moment.likeCount} 点赞</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(moment.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-4"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Container>
      </main>
    </div>
  );
}
