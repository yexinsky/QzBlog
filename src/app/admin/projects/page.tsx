'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Trash2,
  Edit,
  Star,
  ArrowUp,
  ArrowDown,
  X,
  Save,
  ExternalLink,
  Github,
  Eye,
  EyeOff,
  FolderOpen,
} from 'lucide-react';

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
  updatedAt: string;
}

const emptyForm = {
  name: '',
  description: '',
  techStack: '',
  githubUrl: '',
  demoUrl: '',
  starCount: 0,
  isFeatured: false,
  sortOrder: 0,
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (project: Project) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      description: project.description || '',
      techStack: Array.isArray(project.techStack)
        ? project.techStack.join(', ')
        : '',
      githubUrl: project.githubUrl || '',
      demoUrl: project.demoUrl || '',
      starCount: project.starCount || 0,
      isFeatured: project.isFeatured,
      sortOrder: project.sortOrder,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('项目名称不能为空');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        techStack: form.techStack
          ? form.techStack.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        githubUrl: form.githubUrl.trim() || null,
        demoUrl: form.demoUrl.trim() || null,
        starCount: form.starCount,
        isFeatured: form.isFeatured,
        sortOrder: form.sortOrder,
      };

      if (editingId) {
        const response = await fetch(`/api/projects/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          setProjects((prev) =>
            prev.map((p) => (p.id === editingId ? { ...p, ...data.project } : p))
          );
          closeForm();
        } else {
          alert('更新失败');
        }
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          setProjects((prev) => [...prev, data.project]);
          closeForm();
        } else {
          alert('创建失败');
        }
      }
    } catch (error) {
      console.error('Save project failed:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除项目「${name}」吗？此操作不可撤销。`)) return;
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Delete project failed:', error);
      alert('删除失败，请重试');
    }
  };

  const handleToggleFeatured = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !project.isFeatured }),
      });
      if (response.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id ? { ...p, isFeatured: !p.isFeatured } : p
          )
        );
      }
    } catch (error) {
      console.error('Toggle featured failed:', error);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = projects[index];
    const prev = projects[index - 1];

    const newSortOrder = current.sortOrder;
    const prevSortOrder = prev.sortOrder;

    // Swap sort orders locally
    const updated = [...projects];
    updated[index] = { ...current, sortOrder: prevSortOrder };
    updated[index - 1] = { ...prev, sortOrder: newSortOrder };
    // Swap array positions
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    setProjects(updated);

    // Persist both changes
    try {
      await Promise.all([
        fetch(`/api/projects/${current.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: prevSortOrder }),
        }),
        fetch(`/api/projects/${prev.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: newSortOrder }),
        }),
      ]);
    } catch (error) {
      console.error('Reorder failed:', error);
      fetchProjects();
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === projects.length - 1) return;
    const current = projects[index];
    const next = projects[index + 1];

    const newSortOrder = current.sortOrder;
    const nextSortOrder = next.sortOrder;

    const updated = [...projects];
    updated[index] = { ...current, sortOrder: nextSortOrder };
    updated[index + 1] = { ...next, sortOrder: newSortOrder };
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setProjects(updated);

    try {
      await Promise.all([
        fetch(`/api/projects/${current.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: nextSortOrder }),
        }),
        fetch(`/api/projects/${next.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: newSortOrder }),
        }),
      ]);
    } catch (error) {
      console.error('Reorder failed:', error);
      fetchProjects();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background-cream">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <Container maxWidth="full">
            <div className="text-center py-12 text-text-muted">加载中...</div>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background-cream">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <Container maxWidth="full">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary mb-2">
                项目管理
              </h1>
              <p className="text-text-muted">管理你的开源项目和作品展示</p>
            </div>
            <Button onClick={openCreateForm}>
              <Plus className="w-4 h-4 mr-2" />
              添加项目
            </Button>
          </div>

          {/* Project List */}
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-12 h-12 mx-auto text-border-strong dark:text-text-secondary mb-4" />
              <p className="text-text-muted mb-4">暂无项目</p>
              <Button onClick={openCreateForm}>
                <Plus className="w-4 h-4 mr-2" />
                添加第一个项目
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  className="p-5 border border-border dark:border-border-strong rounded-lg bg-white dark:bg-background-base hover:bg-background-hover dark:hover:bg-background-base transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary truncate">
                          {project.name}
                        </h3>
                        {project.isFeatured && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-[#D36F2B]/10 text-[#D36F2B] rounded">
                            推荐
                          </span>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-sm text-text-secondary dark:text-text-secondary mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* Tech Stack */}
                      {Array.isArray(project.techStack) && project.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {project.techStack.map((tech, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-background-cream dark:bg-background-hover text-text-secondary dark:text-text-secondary rounded border border-border dark:border-border-strong"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Links and Star Count */}
                      <div className="flex items-center gap-4 text-xs text-text-muted">
                        {project.githubUrl && (
                          <a
                            href={project.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-[#D36F2B] transition-colors"
                          >
                            <Github className="w-3.5 h-3.5" />
                            GitHub
                          </a>
                        )}
                        {project.demoUrl && (
                          <a
                            href={project.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-[#D36F2B] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Demo
                          </a>
                        )}
                        {project.starCount != null && project.starCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5" />
                            {project.starCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Sort Buttons */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className={index === 0 ? 'opacity-30' : ''}
                        title="上移"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === projects.length - 1}
                        className={index === projects.length - 1 ? 'opacity-30' : ''}
                        title="下移"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>

                      {/* Toggle Featured */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFeatured(project)}
                        title={project.isFeatured ? '取消推荐' : '设为推荐'}
                        className={project.isFeatured ? 'text-[#D36F2B]' : 'text-text-muted'}
                      >
                        {project.isFeatured ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>

                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(project)}
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id, project.name)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create / Edit Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={closeForm}
              />

              {/* Modal Content */}
              <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-background-base rounded-xl shadow-2xl border border-border dark:border-border-strong">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-strong">
                  <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">
                    {editingId ? '编辑项目' : '添加项目'}
                  </h2>
                  <button
                    onClick={closeForm}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary dark:hover:text-text-primary hover:bg-background-hover dark:hover:bg-background-hover transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-5 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1.5">
                      项目名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如：QzBlog"
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-lg bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1.5">
                      项目描述
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="简要描述这个项目..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-lg bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] transition-colors resize-none"
                    />
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1.5">
                      技术栈
                    </label>
                    <input
                      type="text"
                      value={form.techStack}
                      onChange={(e) =>
                        setForm({ ...form, techStack: e.target.value })
                      }
                      placeholder="用逗号分隔，例如：Next.js, TypeScript, Tailwind CSS"
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-lg bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] transition-colors"
                    />
                    <p className="mt-1 text-xs text-text-muted">多个技术栈用逗号分隔</p>
                  </div>

                  {/* GitHub URL & Demo URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1.5">
                        GitHub 地址
                      </label>
                      <input
                        type="url"
                        value={form.githubUrl}
                        onChange={(e) =>
                          setForm({ ...form, githubUrl: e.target.value })
                        }
                        placeholder="https://github.com/..."
                        className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-lg bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1.5">
                        Demo 地址
                      </label>
                      <input
                        type="url"
                        value={form.demoUrl}
                        onChange={(e) =>
                          setForm({ ...form, demoUrl: e.target.value })
                        }
                        placeholder="https://example.com"
                        className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-lg bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Star Count & Sort Order */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1.5">
                        Star 数量
                      </label>
                      <input
                        type="number"
                        value={form.starCount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            starCount: parseInt(e.target.value) || 0,
                          })
                        }
                        min={0}
                        className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-lg bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-1.5">
                        排序权重
                      </label>
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            sortOrder: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-lg bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Featured Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, isFeatured: !form.isFeatured })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        form.isFeatured
                          ? 'bg-[#D36F2B]'
                          : 'bg-border-strong dark:bg-background-hover'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.isFeatured ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <label className="text-sm font-medium text-text-secondary dark:text-text-secondary">
                      设为推荐项目
                    </label>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border dark:border-border-strong">
                  <Button variant="secondary" onClick={closeForm}>
                    取消
                  </Button>
                  <Button onClick={handleSave} loading={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? '保存更改' : '创建项目'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
