'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { Heart, Clock, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Moment {
  id: string;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  publishedAt: string;
  createdAt: string;
  isLiked: boolean;
}

export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchMoments();
  }, [page]);

  const fetchMoments = async () => {
    try {
      const response = await fetch(`/api/moments?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setMoments(data.moments);
        } else {
          setMoments((prev) => [...prev, ...data.moments]);
        }
        setHasMore(data.pagination.page < data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch moments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (momentId: string) => {
    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ momentId }),
      });

      if (response.ok) {
        setMoments((prev) =>
          prev.map((m) =>
            m.id === momentId
              ? { ...m, likeCount: m.likeCount + 1, isLiked: true }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Like failed:', error);
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
    <div className="min-h-screen bg-background-cream">
      <Header />
      <main className="py-8">
        <Container maxWidth="4xl">
          <PageTitle
            title="动态"
            description="记录想法、分享进展"
          />

          {isLoading ? (
            <div className="text-center py-12 text-text-muted">加载中...</div>
          ) : moments.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-lg mb-4">暂无动态</p>
              <p>博主还没有发布任何动态</p>
            </div>
          ) : (
            <div className="relative">
              {/* 时间轴线 */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border dark:bg-border-strong" />

              {/* 动态列表 */}
              <div className="space-y-6">
                {moments.map((moment, index) => (
                  <div key={moment.id} className="relative pl-20">
                    {/* 时间轴节点 */}
                    <div className="absolute left-6 top-6 w-4 h-4 rounded-full bg-brand-orange border-4 border-background-cream dark:border-background-base" />

                    {/* 动态卡片 */}
                    <Card className="transition-all duration-200 hover:shadow-md">
                      <CardContent className="p-6">
                        {/* 时间 */}
                        <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
                          <Clock className="w-4 h-4" />
                          <span>{formatRelativeTime(moment.publishedAt)}</span>
                        </div>

                        {/* 内容 */}
                        <p className="text-text-secondary dark:text-text-secondary mb-4 whitespace-pre-wrap">
                          {moment.content}
                        </p>

                        {/* 图片 */}
                        {moment.imageUrl && (
                          <div className="mb-4">
                            <img
                              src={moment.imageUrl}
                              alt="动态图片"
                              className="max-w-full rounded-8 max-h-96 object-cover"
                            />
                          </div>
                        )}

                        {/* 操作栏 */}
                        <div className="flex items-center gap-4 pt-4 border-t border-border dark:border-border-strong">
                          <button
                            onClick={() => handleLike(moment.id)}
                            disabled={moment.isLiked}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5 rounded-8 text-sm transition-colors',
                              moment.isLiked
                                ? 'text-red-500 bg-red-50'
                                : 'text-text-muted hover:text-red-500 hover:bg-red-50'
                            )}
                          >
                            <Heart
                              className={cn(
                                'w-4 h-4',
                                moment.isLiked && 'fill-red-500'
                              )}
                            />
                            <span>{moment.likeCount}</span>
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>

              {/* 加载更多 */}
              {hasMore && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setPage((prev) => prev + 1)}
                    className="px-6 py-2 bg-background-base border border-border dark:border-border-strong rounded-8 text-text-secondary dark:text-text-secondary hover:bg-background-hover dark:hover:bg-background-hover transition-colors"
                  >
                    加载更多
                  </button>
                </div>
              )}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
