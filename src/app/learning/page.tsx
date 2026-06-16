'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BookOpen, CheckCircle, Circle, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LearningRoute {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  learningGoal: string | null;
  coverImage: string | null;
  totalNodes: number;
  completedNodes: number;
  progress: number;
  nodes: LearningNode[];
}

interface LearningNode {
  id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'learning' | 'completed';
  postId: string | null;
  post: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export default function LearningPage() {
  const [routes, setRoutes] = useState<LearningRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/learning');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data.learningRoutes || []);
      }
    } catch (error) {
      console.error('Failed to fetch learning routes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'learning':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Circle className="w-5 h-5 text-[#777777]" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'learning':
        return '学习中';
      default:
        return '计划中';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA] dark:bg-[#1E1E1E]">
      <Header />
      <main className="py-8">
        <Container maxWidth="4xl">
          <PageTitle
            title="学习路线"
            description="结构化学习路径，系统化提升技能"
          />

          {isLoading ? (
            <div className="text-center py-12 text-[#777777]">加载中...</div>
          ) : routes.length === 0 ? (
            <div className="text-center py-12 text-[#777777]">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-4">暂无学习路线</p>
              <p>博主还没有创建任何学习路线</p>
            </div>
          ) : (
            <div className="space-y-8">
              {routes.map((route) => (
                <Card key={route.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-[#D36F2B] to-[#E8893C] p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{route.title}</h2>
                        {route.description && (
                          <p className="text-white/80">{route.description}</p>
                        )}
                        {route.learningGoal && (
                          <p className="text-white/90 mt-2 font-medium">🎯 {route.learningGoal}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-white">{route.progress}%</div>
                        <div className="text-white/80 text-sm">
                          {route.completedNodes}/{route.totalNodes} 节点
                        </div>
                      </div>
                    </div>

                    {/* 进度条 */}
                    <div className="mt-4">
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-white rounded-full h-2 transition-all duration-300"
                          style={{ width: `${route.progress}%` }}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    {route.nodes && route.nodes.length > 0 ? (
                      <div className="space-y-4">
                        {route.nodes.map((node, index) => (
                          <div
                            key={node.id}
                            className={cn(
                              'flex items-start gap-4 p-4 rounded-8 border transition-colors',
                              node.status === 'completed'
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                : node.status === 'learning'
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                : 'bg-white border-[#EBE7E0] dark:bg-[#2A2A2A] dark:border-[#444444]'
                            )}
                          >
                            {/* 状态图标 */}
                            <div className="flex-shrink-0 mt-0.5">
                              {getStatusIcon(node.status)}
                            </div>

                            {/* 内容 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-[#777777]">
                                  {index + 1}.
                                </span>
                                <h3 className="font-medium text-[#1A1A1A] dark:text-[#E0E0E0]">
                                  {node.title}
                                </h3>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-[#EBE7E0] dark:bg-[#444444] text-[#777777]">
                                  {getStatusText(node.status)}
                                </span>
                              </div>
                              {node.description && (
                                <p className="text-sm text-[#777777] mb-2">{node.description}</p>
                              )}
                              {node.post && (
                                <Link
                                  href={`/posts/${node.post.slug}`}
                                  className="inline-flex items-center gap-1 text-sm text-[#D36F2B] hover:underline"
                                >
                                  📄 {node.post.title}
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[#777777]">
                        <p>暂无学习节点</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
