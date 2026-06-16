'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MarkdownEditorWithToolbar } from '@/components/article/MarkdownEditor';
import { Save, Eye, Send, Clock, ArrowLeft } from 'lucide-react';

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  // 自动保存草稿
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (title || content) {
        handleAutoSave();
      }
    }, 30000); // 每 30 秒自动保存

    return () => clearInterval(autoSaveInterval);
  }, [title, content]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSaveDraft();
        } else if (e.shiftKey && e.key === 'P') {
          e.preventDefault();
          handlePublish();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, content]);

  const handleAutoSave = async () => {
    if (!title && !content) return;

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || '未命名草稿',
          contentMd: content,
          summary,
          status: 'draft',
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Auto save failed:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!title) {
      alert('请输入文章标题');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          contentMd: content,
          summary,
          status: 'draft',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSaved(new Date());
        alert('草稿已保存');
        router.push('/admin/posts');
      } else {
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('Save draft failed:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title) {
      alert('请输入文章标题');
      return;
    }

    if (!content) {
      alert('请输入文章内容');
      return;
    }

    if (!confirm('确定要发布这篇文章吗？')) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          contentMd: content,
          summary,
          status: 'published',
        }),
      });

      if (response.ok) {
        alert('文章已发布');
        router.push('/admin/posts');
      } else {
        alert('发布失败，请重试');
      }
    } catch (error) {
      console.error('Publish failed:', error);
      alert('发布失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!content) {
      alert('请输入文章内容');
      return;
    }

    try {
      const response = await fetch('/api/markdown/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewHtml(data.html);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F1EA] dark:bg-[#1E1E1E]">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <Container maxWidth="full">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#E0E0E0]">新建文章</h1>
                {lastSaved && (
                  <p className="text-sm text-[#777777] mt-1">
                    上次保存: {lastSaved.toLocaleTimeString('zh-CN')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" />
                预览
              </Button>
              <Button variant="ghost" onClick={handleSaveDraft} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? '保存中...' : '保存草稿'}
              </Button>
              <Button onClick={handlePublish} disabled={isSaving}>
                <Send className="w-4 h-4 mr-2" />
                {isSaving ? '发布中...' : '发布'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Panel */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">编辑</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      文章标题
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="请输入文章标题"
                      className="w-full px-4 py-3 text-lg border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      文章摘要（可选）
                    </label>
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="请输入文章摘要，留空将自动截取"
                      rows={3}
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B] resize-none"
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      文章内容
                    </label>
                    <MarkdownEditorWithToolbar
                      value={content}
                      onChange={setContent}
                      placeholder="在这里编写 Markdown 内容..."
                      minHeight="500px"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">预览</h2>
              </CardHeader>
              <CardContent>
                {showPreview ? (
                  <div
                    className="prose prose-lg max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="text-center py-12 text-[#777777]">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>点击「预览」按钮查看渲染效果</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="mt-6 text-sm text-[#777777]">
            <p>快捷键: <kbd className="px-2 py-1 bg-[#EBE7E0] dark:bg-[#444444] rounded text-xs">Ctrl+S</kbd> 保存草稿 | <kbd className="px-2 py-1 bg-[#EBE7E0] dark:bg-[#444444] rounded text-xs">Ctrl+Shift+P</kbd> 发布</p>
          </div>
        </Container>
      </main>
    </div>
  );
}
