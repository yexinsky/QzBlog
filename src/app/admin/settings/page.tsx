'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Save, Moon, Sun } from 'lucide-react';

interface SiteSettings {
  id: string;
  siteName: string;
  siteDescription: string | null;
  siteLogo: string | null;
  siteFavicon: string | null;
  avatarUrl: string | null;
  bio: string | null;
  darkModeDefault: boolean;
  customCss: string | null;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    siteName: '',
    siteDescription: '',
    siteLogo: '',
    siteFavicon: '',
    avatarUrl: '',
    bio: '',
    darkModeDefault: false,
    customCss: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
          setFormData({
            siteName: data.settings.siteName || '',
            siteDescription: data.settings.siteDescription || '',
            siteLogo: data.settings.siteLogo || '',
            siteFavicon: data.settings.siteFavicon || '',
            avatarUrl: data.settings.avatarUrl || '',
            bio: data.settings.bio || '',
            darkModeDefault: data.settings.darkModeDefault || false,
            customCss: data.settings.customCss || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.siteName) {
      alert('请输入站点名称');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        alert('设置已保存');
      } else {
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('Save settings failed:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
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
        <Container maxWidth="4xl">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#E0E0E0] mb-2">站点设置</h1>
              <p className="text-[#777777]">配置站点基本信息</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? '保存中...' : '保存设置'}
            </Button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">基本信息</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      站点名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.siteName}
                      onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                      placeholder="QzBlog"
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      站点描述（用于 SEO）
                    </label>
                    <textarea
                      value={formData.siteDescription}
                      onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                      placeholder="分享技术心得，记录成长历程"
                      rows={3}
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      博主简介
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="全栈开发工程师，热爱技术，喜欢分享"
                      rows={3}
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B] resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">图片设置</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      站点 Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.siteLogo}
                      onChange={(e) => setFormData({ ...formData, siteLogo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      站点 Favicon URL
                    </label>
                    <input
                      type="url"
                      value={formData.siteFavicon}
                      onChange={(e) => setFormData({ ...formData, siteFavicon: e.target.value })}
                      placeholder="https://example.com/favicon.ico"
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      博主头像 URL
                    </label>
                    <input
                      type="url"
                      value={formData.avatarUrl}
                      onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B]"
                    />
                    {formData.avatarUrl && (
                      <div className="mt-2">
                        <img
                          src={formData.avatarUrl}
                          alt="头像预览"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#E0E0E0]">外观设置</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F0EBE3] dark:bg-[#2A2A2A] rounded-8">
                    <div className="flex items-center gap-3">
                      {formData.darkModeDefault ? (
                        <Moon className="w-5 h-5 text-[#777777]" />
                      ) : (
                        <Sun className="w-5 h-5 text-[#777777]" />
                      )}
                      <div>
                        <div className="font-medium text-[#1A1A1A] dark:text-[#E0E0E0]">
                          默认主题
                        </div>
                        <div className="text-sm text-[#777777]">
                          {formData.darkModeDefault ? '暗色模式' : '亮色模式'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, darkModeDefault: !formData.darkModeDefault })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.darkModeDefault ? 'bg-[#D36F2B]' : 'bg-[#D9D2C8]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.darkModeDefault ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] dark:text-[#E0E0E0] mb-2">
                      自定义 CSS（高级配置）
                    </label>
                    <textarea
                      value={formData.customCss}
                      onChange={(e) => setFormData({ ...formData, customCss: e.target.value })}
                      placeholder="/* 自定义样式 */"
                      rows={6}
                      className="w-full px-4 py-3 border border-[#D9D2C8] dark:border-[#444444] rounded-8 bg-white dark:bg-[#1E1E1E] text-[#1A1A1A] dark:text-[#E0E0E0] focus:outline-none focus:border-[#D36F2B] resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
    </div>
  );
}
