'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Save, Plus, Trash2, Edit, X } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  category: string | null;
  proficiency: number | null;
  sortOrder: number;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string | null;
  sortOrder: number;
  isVisible: boolean;
}

interface WorkExperience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  sortOrder: number;
}

export default function AdminProfilePage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 新增技能表单
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: '',
    proficiency: 0,
    color: '#D36F2B',
  });

  // 新增社交链接表单
  const [newSocialLink, setNewSocialLink] = useState({
    platform: '',
    url: '',
  });

  // 新增工作经历表单
  const [newWorkExperience, setNewWorkExperience] = useState({
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [skillsRes, socialLinksRes, workExpRes] = await Promise.all([
        fetch('/api/skills'),
        fetch('/api/social-links'),
        fetch('/api/work-experience'),
      ]);

      if (skillsRes.ok) {
        const data = await skillsRes.json();
        setSkills(data.skills || []);
      }

      if (socialLinksRes.ok) {
        const data = await socialLinksRes.json();
        setSocialLinks(data.socialLinks || []);
      }

      if (workExpRes.ok) {
        const data = await workExpRes.json();
        setWorkExperience(data.workExperience || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.name) {
      alert('请输入技能名称');
      return;
    }

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSkill),
      });

      if (response.ok) {
        const data = await response.json();
        setSkills((prev) => [...prev, data]);
        setNewSkill({ name: '', category: '', proficiency: 0, color: '#D36F2B' });
      } else {
        alert('添加失败');
      }
    } catch (error) {
      console.error('Add skill failed:', error);
      alert('添加失败');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('确定要删除这个技能吗？')) return;

    try {
      const response = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error('Delete skill failed:', error);
    }
  };

  const handleAddSocialLink = async () => {
    if (!newSocialLink.platform || !newSocialLink.url) {
      alert('请填写平台名称和链接');
      return;
    }

    try {
      const response = await fetch('/api/social-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSocialLink),
      });

      if (response.ok) {
        const data = await response.json();
        setSocialLinks((prev) => [...prev, data]);
        setNewSocialLink({ platform: '', url: '' });
      } else {
        alert('添加失败');
      }
    } catch (error) {
      console.error('Add social link failed:', error);
      alert('添加失败');
    }
  };

  const handleDeleteSocialLink = async (id: string) => {
    if (!confirm('确定要删除这个社交链接吗？')) return;

    try {
      const response = await fetch(`/api/social-links/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSocialLinks((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error('Delete social link failed:', error);
    }
  };

  const handleAddWorkExperience = async () => {
    if (!newWorkExperience.company || !newWorkExperience.position || !newWorkExperience.startDate) {
      alert('请填写公司、职位和入职日期');
      return;
    }

    try {
      const response = await fetch('/api/work-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newWorkExperience,
          endDate: newWorkExperience.endDate || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setWorkExperience((prev) => [...prev, data]);
        setNewWorkExperience({
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          description: '',
        });
      } else {
        alert('添加失败');
      }
    } catch (error) {
      console.error('Add work experience failed:', error);
      alert('添加失败');
    }
  };

  const handleDeleteWorkExperience = async (id: string) => {
    if (!confirm('确定要删除这条工作经历吗？')) return;

    try {
      const response = await fetch(`/api/work-experience/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setWorkExperience((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (error) {
      console.error('Delete work experience failed:', error);
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
            <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#E0E0E0] mb-2">个人资料管理</h1>
            <p className="text-[#777777]">管理技能栈、社交链接和工作经历</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Skills Section */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">技能栈</h2>
              </CardHeader>
              <CardContent>
                {/* Add Skill Form */}
                <div className="mb-6 p-4 bg-[#F0EBE3] dark:bg-[#2A2A2A] rounded-8">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="技能名称"
                      value={newSkill.name}
                      onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                    <input
                      type="text"
                      placeholder="分类（如：前端）"
                      value={newSkill.category}
                      onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="熟练度"
                      min="0"
                      max="100"
                      value={newSkill.proficiency}
                      onChange={(e) => setNewSkill({ ...newSkill, proficiency: parseInt(e.target.value) || 0 })}
                      className="w-24 px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                    <input
                      type="color"
                      value={newSkill.color}
                      onChange={(e) => setNewSkill({ ...newSkill, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Button onClick={handleAddSkill} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>
                </div>

                {/* Skills List */}
                <div className="space-y-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-[#2A2A2A] rounded-8 border border-[#EBE7E0] dark:border-[#444444]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: skill.color || '#D36F2B' }}
                        />
                        <span className="font-medium text-[#1A1A1A] dark:text-[#E0E0E0]">
                          {skill.name}
                        </span>
                        {skill.category && (
                          <span className="text-xs px-2 py-0.5 bg-[#EBE7E0] dark:bg-[#444444] rounded">
                            {skill.category}
                          </span>
                        )}
                        {skill.proficiency ? (
                          <span className="text-xs text-[#777777]">{skill.proficiency}%</span>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Social Links Section */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">社交链接</h2>
              </CardHeader>
              <CardContent>
                {/* Add Social Link Form */}
                <div className="mb-6 p-4 bg-[#F0EBE3] dark:bg-[#2A2A2A] rounded-8">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="平台名称（如：GitHub）"
                      value={newSocialLink.platform}
                      onChange={(e) => setNewSocialLink({ ...newSocialLink, platform: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                    <input
                      type="url"
                      placeholder="链接地址"
                      value={newSocialLink.url}
                      onChange={(e) => setNewSocialLink({ ...newSocialLink, url: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                  </div>
                  <Button onClick={handleAddSocialLink} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>

                {/* Social Links List */}
                <div className="space-y-2">
                  {socialLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-[#2A2A2A] rounded-8 border border-[#EBE7E0] dark:border-[#444444]"
                    >
                      <div>
                        <span className="font-medium text-[#1A1A1A] dark:text-[#E0E0E0]">
                          {link.platform}
                        </span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#D36F2B] hover:underline ml-2"
                        >
                          {link.url}
                        </a>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSocialLink(link.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Work Experience Section */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">工作经历</h2>
              </CardHeader>
              <CardContent>
                {/* Add Work Experience Form */}
                <div className="mb-6 p-4 bg-[#F0EBE3] dark:bg-[#2A2A2A] rounded-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="公司名称"
                      value={newWorkExperience.company}
                      onChange={(e) => setNewWorkExperience({ ...newWorkExperience, company: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                    <input
                      type="text"
                      placeholder="职位"
                      value={newWorkExperience.position}
                      onChange={(e) => setNewWorkExperience({ ...newWorkExperience, position: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                    <input
                      type="date"
                      placeholder="入职日期"
                      value={newWorkExperience.startDate}
                      onChange={(e) => setNewWorkExperience({ ...newWorkExperience, startDate: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                    <input
                      type="date"
                      placeholder="离职日期（可选）"
                      value={newWorkExperience.endDate}
                      onChange={(e) => setNewWorkExperience({ ...newWorkExperience, endDate: e.target.value })}
                      className="px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm"
                    />
                  </div>
                  <textarea
                    placeholder="工作描述（可选）"
                    value={newWorkExperience.description}
                    onChange={(e) => setNewWorkExperience({ ...newWorkExperience, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-sm mb-3"
                  />
                  <Button onClick={handleAddWorkExperience} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>

                {/* Work Experience List */}
                <div className="space-y-4">
                  {workExperience.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 bg-white dark:bg-[#2A2A2A] rounded-8 border border-[#EBE7E0] dark:border-[#444444]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-[#1A1A1A] dark:text-[#E0E0E0]">
                            {exp.position}
                          </h3>
                          <p className="text-[#777777]">{exp.company}</p>
                          <p className="text-sm text-[#777777]">
                            {new Date(exp.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric' })}
                            {' - '}
                            {exp.endDate
                              ? new Date(exp.endDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric' })
                              : '至今'}
                          </p>
                          {exp.description && (
                            <p className="text-sm text-[#444444] dark:text-[#E0E0E0] mt-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorkExperience(exp.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  );
}
