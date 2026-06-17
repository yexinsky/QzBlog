'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { Briefcase, GraduationCap, Code, Mic, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  eventType: 'work' | 'study' | 'open_source' | 'speech' | 'other';
  icon: string | null;
  sortOrder: number;
  isPublic: boolean;
}

const eventTypeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  work: {
    icon: <Briefcase className="w-5 h-5" />,
    color: 'bg-blue-500',
    label: '工作',
  },
  study: {
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'bg-green-500',
    label: '学习',
  },
  open_source: {
    icon: <Code className="w-5 h-5" />,
    color: 'bg-purple-500',
    label: '开源',
  },
  speech: {
    icon: <Mic className="w-5 h-5" />,
    color: 'bg-orange-500',
    label: '演讲',
  },
  other: {
    icon: <MoreHorizontal className="w-5 h-5" />,
    color: 'bg-gray-500',
    label: '其他',
  },
};

export default function TimelinePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      const response = await fetch('/api/milestones?isPublic=true');
      if (response.ok) {
        const data = await response.json();
        setMilestones(data.milestones || []);
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMilestones = filter === 'all'
    ? milestones
    : milestones.filter((m) => m.eventType === filter);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background-cream">
      <Header />
      <main className="py-8">
        <Container maxWidth="4xl">
          <PageTitle
            title="时间线"
            description="记录重要时刻与成长轨迹"
          />

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-4 py-2 rounded-8 text-sm transition-colors',
                filter === 'all'
                  ? 'bg-brand-orange text-white'
                  : 'bg-background-base text-text-muted hover:bg-background-hover dark:hover:bg-background-hover'
              )}
            >
              全部
            </button>
            {Object.entries(eventTypeConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-4 py-2 rounded-8 text-sm transition-colors flex items-center gap-1.5',
                  filter === key
                    ? 'bg-brand-orange text-white'
                    : 'bg-background-base text-text-muted hover:bg-background-hover dark:hover:bg-background-hover'
                )}
              >
                {config.icon}
                {config.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-text-muted">加载中...</div>
          ) : filteredMilestones.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-4">暂无时间线数据</p>
              <p>博主还没有添加任何里程碑</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border dark:bg-border-strong" />

              <div className="space-y-8">
                {filteredMilestones.map((milestone) => {
                  const config = eventTypeConfig[milestone.eventType] || eventTypeConfig.other;
                  return (
                    <div key={milestone.id} className="relative pl-20">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-5 top-6 w-7 h-7 rounded-full flex items-center justify-center text-white',
                        config.color
                      )}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm text-text-muted">
                              {formatDate(milestone.eventDate)}
                            </span>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full text-white',
                              config.color
                            )}>
                              {config.label}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-text-primary dark:text-text-primary mb-2">
                            {milestone.title}
                          </h3>

                          {milestone.description && (
                            <p className="text-text-muted whitespace-pre-wrap">
                              {milestone.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
