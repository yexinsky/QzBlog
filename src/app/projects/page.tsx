'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { Github, ExternalLink, Star, Folder } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  techStack: string[];
  coverImage: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  starCount: number | null;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-cream">
      <Header />
      <main className="py-8">
        <Container maxWidth="4xl">
          <PageTitle
            title="项目展示"
            description="个人开源项目与技术实践"
          />

          {isLoading ? (
            <div className="text-center py-12 text-text-muted">加载中...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Folder className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-4">暂无项目</p>
              <p>博主还没有添加任何项目</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {project.coverImage && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={project.coverImage}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-text-primary dark:text-text-primary">
                        {project.name}
                      </h3>
                      {project.isFeatured && (
                        <span className="text-xs px-2 py-1 bg-brand-orange/10 text-brand-orange rounded-full">
                          精选
                        </span>
                      )}
                    </div>

                    {project.description && (
                      <p className="text-text-muted mb-4 line-clamp-3">
                        {project.description}
                      </p>
                    )}

                    {/* Tech Stack */}
                    {project.techStack && project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-background-hover dark:bg-background-hover text-text-muted rounded"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-border dark:border-border-strong">
                      {project.starCount !== null && project.starCount > 0 && (
                        <span className="flex items-center gap-1 text-sm text-text-muted">
                          <Star className="w-4 h-4" />
                          {project.starCount}
                        </span>
                      )}
                      <div className="flex-1" />
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-text-muted hover:text-brand-orange transition-colors"
                        >
                          <Github className="w-4 h-4" />
                          源码
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-text-muted hover:text-brand-orange transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          演示
                        </a>
                      )}
                    </div>
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
