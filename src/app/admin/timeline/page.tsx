'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Edit, Save, X, Calendar, ArrowUpDown, Briefcase, BookOpen, GitBranch, Mic, MoreHorizontal } from 'lucide-react';

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

const EVENT_TYPE_OPTIONS = [
  { value: 'work', label: '工作', icon: Briefcase, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'study', label: '学习', icon: BookOpen, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'open_source', label: '开源', icon: GitBranch, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'speech', label: '演讲', icon: Mic, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'other', label: '其他', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-300' },
] as const;

const EVENT_TYPE_MAP = Object.fromEntries(
  EVENT_TYPE_OPTIONS.map((opt) => [opt.value, opt])
) as Record<string, (typeof EVENT_TYPE_OPTIONS)[number]>;

type MilestoneForm = {
  title: string;
  description: string;
  eventDate: string;
  eventType: 'work' | 'study' | 'open_source' | 'speech' | 'other';
  sortOrder: string;
  isPublic: boolean;
};

const defaultForm: MilestoneForm = {
  title: '',
  description: '',
  eventDate: new Date().toISOString().slice(0, 10),
  eventType: 'work',
  sortOrder: '0',
  isPublic: true,
};

export default function AdminTimelinePage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Create mode / Edit mode
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MilestoneForm>(defaultForm);
  const [showForm, setShowForm] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null);

  useEffect(() => {
    fetchMilestones();
  }, []);

  const fetchMilestones = async () => {
    try {
      const response = await fetch('/api/milestones');
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

  const openCreateForm = () => {
    setMode('create');
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEditForm = (milestone: Milestone) => {
    setMode('edit');
    setEditingId(milestone.id);
    setForm({
      title: milestone.title,
      description: milestone.description || '',
      eventDate: milestone.eventDate.slice(0, 10),
      eventType: milestone.eventType,
      sortOrder: String(milestone.sortOrder),
      isPublic: milestone.isPublic,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('请输入标题');
      return;
    }
    if (!form.eventDate) {
      alert('请选择事件日期');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        eventDate: form.eventDate,
        eventType: form.eventType,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        isPublic: form.isPublic,
      };

      let response: Response;

      if (mode === 'create') {
        response = await fetch('/api/milestones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`/api/milestones/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        const saved = await response.json();
        if (mode === 'create') {
          setMilestones((prev) => [...prev, saved]);
        } else {
          setMilestones((prev) =>
            prev.map((m) => (m.id === editingId ? saved : m))
          );
        }
        closeForm();
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.error || '保存失败，请重试');
      }
    } catch (error) {
      console.error('Save milestone failed:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/milestones/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMilestones((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Delete milestone failed:', error);
      alert('删除失败，请重试');
    }
  };

  const sortedMilestones = [...milestones].sort((a, b) => {
    const dateCompare = new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return (b.sortOrder || 0) - (a.sortOrder || 0);
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background-cream">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <Container maxWidth="full">
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D36F2B] border-t-transparent" />
              <span className="ml-3 text-text-muted">加载中...</span>
            </div>
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
              <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary mb-2">时间线管理</h1>
              <p className="text-text-muted">管理你的里程碑事件，展示成长轨迹</p>
            </div>
            <Button onClick={openCreateForm}>
              <Plus className="w-4 h-4 mr-2" />
              新建里程碑
            </Button>
          </div>

          {/* Inline Create/Edit Form */}
          {showForm && (
            <Card className="mb-8 border-[#D36F2B]/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">
                    {mode === 'create' ? '新建里程碑' : '编辑里程碑'}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={closeForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-1">
                      标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="里程碑标题"
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-1">
                      描述
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="简要描述这个里程碑..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] resize-none"
                    />
                  </div>

                  {/* Event Date */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-1">
                      事件日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.eventDate}
                      onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  {/* Event Type */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-1">
                      事件类型
                    </label>
                    <select
                      value={form.eventType}
                      onChange={(e) => setForm({ ...form, eventType: e.target.value as MilestoneForm['eventType'] })}
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B]"
                    >
                      {EVENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-1">
                      排序序号
                    </label>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 border border-border-strong dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  {/* Is Public */}
                  <div className="flex items-center gap-3 pt-6">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isPublic}
                        onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border-strong dark:bg-background-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D36F2B]" />
                    </label>
                    <span className="text-sm font-medium text-text-secondary dark:text-text-primary">公开显示</span>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={closeForm}>
                    取消
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {mode === 'create' ? '创建' : '保存'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestones Table */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">
                里程碑列表 ({milestones.length})
              </h2>
            </CardHeader>
            <CardContent className="p-0">
              {milestones.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-border-strong dark:text-text-secondary" />
                  <p className="text-text-muted text-lg mb-2">暂无里程碑</p>
                  <p className="text-text-muted text-sm mb-4">创建你的第一个里程碑，开始记录成长轨迹</p>
                  <Button onClick={openCreateForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    新建里程碑
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border dark:border-border-strong">
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            日期
                          </div>
                        </th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">标题</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-muted">类型</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-muted hidden md:table-cell">描述</th>
                        <th className="text-center px-6 py-3 text-sm font-medium text-text-muted">
                          <div className="flex items-center justify-center gap-1">
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            排序
                          </div>
                        </th>
                        <th className="text-right px-6 py-3 text-sm font-medium text-text-muted">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMilestones.map((milestone) => {
                        const typeInfo = EVENT_TYPE_MAP[milestone.eventType] || EVENT_TYPE_MAP.other;
                        const TypeIcon = typeInfo.icon;
                        return (
                          <tr
                            key={milestone.id}
                            className="border-b border-border dark:border-border-strong last:border-0 hover:bg-background-hover dark:hover:bg-background-base transition-colors"
                          >
                            <td className="px-6 py-4 text-sm text-text-secondary dark:text-text-primary whitespace-nowrap">
                              {formatDate(milestone.eventDate)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary dark:text-text-primary">
                                  {milestone.title}
                                </span>
                                {!milestone.isPublic && (
                                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-border dark:bg-background-hover text-text-muted">
                                    隐藏
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${typeInfo.color}`}>
                                <TypeIcon className="w-3 h-3" />
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-text-muted max-w-xs truncate hidden md:table-cell">
                              {milestone.description || '-'}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-text-muted">
                              {milestone.sortOrder}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditForm(milestone)}
                                  className="text-text-muted hover:text-[#D36F2B]"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteTarget(milestone)}
                                  className="text-text-muted hover:text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </Container>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-background-base rounded-card shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary mb-2">
              确认删除
            </h3>
            <p className="text-text-secondary dark:text-text-primary mb-1">
              确定要删除里程碑「{deleteTarget.title}」吗？
            </p>
            <p className="text-sm text-text-muted mb-6">
              此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                取消
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
