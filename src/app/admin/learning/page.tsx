'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Edit, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

interface LearningRoute {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  learningGoal: string | null;
  coverImage: string | null;
  sortOrder: number;
  isPublic: boolean;
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
  sortOrder: number;
}

export default function AdminLearningPage() {
  const [routes, setRoutes] = useState<LearningRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

  // 新增路线表单
  const [newRoute, setNewRoute] = useState({
    title: '',
    description: '',
    learningGoal: '',
  });

  // 新增节点表单
  const [newNode, setNewNode] = useState({
    routeId: '',
    title: '',
    description: '',
  });

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

  const handleAddRoute = async () => {
    if (!newRoute.title) {
      alert('请输入路线名称');
      return;
    }

    try {
      const response = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoute),
      });

      if (response.ok) {
        const data = await response.json();
        setRoutes((prev) => [...prev, { ...data, nodes: [] }]);
        setNewRoute({ title: '', description: '', learningGoal: '' });
      } else {
        alert('添加失败');
      }
    } catch (error) {
      console.error('Add route failed:', error);
      alert('添加失败');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('确定要删除这条学习路线吗？所有节点也会被删除。')) return;

    try {
      const response = await fetch(`/api/learning/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setRoutes((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (error) {
      console.error('Delete route failed:', error);
    }
  };

  const handleAddNode = async (routeId: string) => {
    if (!newNode.title) {
      alert('请输入节点标题');
      return;
    }

    try {
      const response = await fetch(`/api/learning/${routeId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNode.title,
          description: newNode.description || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId ? { ...r, nodes: [...r.nodes, data] } : r
          )
        );
        setNewNode({ routeId: '', title: '', description: '' });
      } else {
        alert('添加失败');
      }
    } catch (error) {
      console.error('Add node failed:', error);
      alert('添加失败');
    }
  };

  const handleDeleteNode = async (routeId: string, nodeId: string) => {
    if (!confirm('确定要删除这个节点吗？')) return;

    try {
      const response = await fetch(`/api/learning/nodes/${nodeId}`, { method: 'DELETE' });
      if (response.ok) {
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId
              ? { ...r, nodes: r.nodes.filter((n) => n.id !== nodeId) }
              : r
          )
        );
      }
    } catch (error) {
      console.error('Delete node failed:', error);
    }
  };

  const handleUpdateNodeStatus = async (routeId: string, nodeId: string, status: string) => {
    try {
      const response = await fetch(`/api/learning/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === routeId
              ? {
                  ...r,
                  nodes: r.nodes.map((n) =>
                    n.id === nodeId ? { ...n, status: status as any } : n
                  ),
                }
              : r
          )
        );
      }
    } catch (error) {
      console.error('Update node status failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'learning':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-[#F5F1EA] dark:bg-[#1E1E1E]">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <Container maxWidth="full">
            <div className="text-center py-12 text-[#777777]">加载中...</div>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F5F1EA] dark:bg-[#1E1E1E]">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <Container maxWidth="full">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#E0E0E0] mb-2">学习路线管理</h1>
            <p className="text-[#777777]">创建和管理学习路线及节点</p>
          </div>

          {/* Add Route Form */}
          <Card className="mb-8">
            <CardHeader>
              <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">创建新路线</h2>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="路线名称"
                  value={newRoute.title}
                  onChange={(e) => setNewRoute({ ...newRoute, title: e.target.value })}
                  className="px-4 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E]"
                />
                <input
                  type="text"
                  placeholder="路线简介（可选）"
                  value={newRoute.description}
                  onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                  className="px-4 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E]"
                />
                <input
                  type="text"
                  placeholder="学习目标（可选）"
                  value={newRoute.learningGoal}
                  onChange={(e) => setNewRoute({ ...newRoute, learningGoal: e.target.value })}
                  className="px-4 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E]"
                />
              </div>
              <Button onClick={handleAddRoute}>
                <Plus className="w-4 h-4 mr-2" />
                创建路线
              </Button>
            </CardContent>
          </Card>

          {/* Routes List */}
          <div className="space-y-6">
            {routes.map((route) => {
              const totalNodes = route.nodes?.length || 0;
              const completedNodes = route.nodes?.filter((n) => n.status === 'completed').length || 0;
              const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

              return (
                <Card key={route.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRoute(expandedRoute === route.id ? null : route.id)}
                        >
                          {expandedRoute === route.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        <div>
                          <h3 className="font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">
                            {route.title}
                          </h3>
                          {route.description && (
                            <p className="text-sm text-[#777777]">{route.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-[#1A1A1A] dark:text-[#E0E0E0]">
                            {progress}%
                          </div>
                          <div className="text-xs text-[#777777]">
                            {completedNodes}/{totalNodes} 节点
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoute(route.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#EBE7E0] dark:bg-[#444444] rounded-full h-2 mt-2">
                      <div
                        className="bg-[#D36F2B] rounded-full h-2 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </CardHeader>

                  {expandedRoute === route.id && (
                    <CardContent>
                      {/* Add Node Form */}
                      <div className="mb-6 p-4 bg-[#F0EBE3] dark:bg-[#2A2A2A] rounded-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <input
                            type="text"
                            placeholder="节点标题"
                            value={newNode.title}
                            onChange={(e) => setNewNode({ ...newNode, title: e.target.value })}
                            className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                          />
                          <input
                            type="text"
                            placeholder="节点描述（可选）"
                            value={newNode.description}
                            onChange={(e) => setNewNode({ ...newNode, description: e.target.value })}
                            className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                          />
                        </div>
                        <Button onClick={() => handleAddNode(route.id)} size="sm">
                          <Plus className="w-4 h-4 mr-1" />
                          添加节点
                        </Button>
                      </div>

                      {/* Nodes List */}
                      <div className="space-y-3">
                        {route.nodes && route.nodes.length > 0 ? (
                          route.nodes.map((node, index) => (
                            <div
                              key={node.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-[#2A2A2A] rounded-8 border border-[#EBE7E0] dark:border-[#444444]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-[#777777] w-6">
                                  {index + 1}.
                                </span>
                                <div>
                                  <div className="font-medium text-[#1A1A1A] dark:text-[#E0E0E0]">
                                    {node.title}
                                  </div>
                                  {node.description && (
                                    <div className="text-sm text-[#777777]">{node.description}</div>
                                  )}
                                  {node.post && (
                                    <div className="text-sm text-[#D36F2B]">
                                      📄 {node.post.title}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={node.status}
                                  onChange={(e) => handleUpdateNodeStatus(route.id, node.id, e.target.value)}
                                  className={`px-2 py-1 text-xs rounded ${getStatusColor(node.status)}`}
                                >
                                  <option value="planned">计划中</option>
                                  <option value="learning">学习中</option>
                                  <option value="completed">已完成</option>
                                </select>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteNode(route.id, node.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-[#777777]">
                            暂无节点，请添加学习节点
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {routes.length === 0 && (
            <div className="text-center py-12 text-[#777777]">
              <p className="text-lg mb-4">暂无学习路线</p>
              <p>创建第一条学习路线吧！</p>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
