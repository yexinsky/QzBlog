'use client';

import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ImageUpload } from '@/components/ui/ImageUpload';
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
        <Container maxWidth="4xl">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary mb-2">站点设置</h1>
              <p className="text-text-muted">配置站点基本信息</p>
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
                <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">基本信息</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-2">
                      站点名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.siteName}
                      onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                      placeholder="QzBlog"
                      className="w-full px-4 py-3 border border-border dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-2">
                      站点描述（用于 SEO）
                    </label>
                    <textarea
                      value={formData.siteDescription}
                      onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                      placeholder="分享技术心得，记录成长历程"
                      rows={3}
                      className="w-full px-4 py-3 border border-border dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">图片设置</h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ImageUpload
                    value={formData.siteLogo}
                    onChange={(url) => setFormData({ ...formData, siteLogo: url })}
                    onClear={() => setFormData({ ...formData, siteLogo: '' })}
                    label="站点 Logo"
                    accept="image/*"
                    maxSize={5}
                  />

                  <ImageUpload
                    value={formData.siteFavicon}
                    onChange={(url) => setFormData({ ...formData, siteFavicon: url })}
                    onClear={() => setFormData({ ...formData, siteFavicon: '' })}
                    label="站点 Favicon"
                    accept="image/x-icon,image/png,image/svg+xml,image/webp"
                    maxSize={5}
                  />
                </div>
                <p className="mt-2 text-sm text-text-muted">
                  博主头像和个人简介请在「个人资料」页面进行设置
                </p>
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">外观设置</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background-hover dark:bg-background-base rounded-8">
                    <div className="flex items-center gap-3">
                      {formData.darkModeDefault ? (
                        <Moon className="w-5 h-5 text-text-muted" />
                      ) : (
                        <Sun className="w-5 h-5 text-text-muted" />
                      )}
                      <div>
                        <div className="font-medium text-text-primary dark:text-text-primary">
                          默认主题
                        </div>
                        <div className="text-sm text-text-muted">
                          {formData.darkModeDefault ? '暗色模式' : '亮色模式'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, darkModeDefault: !formData.darkModeDefault })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.darkModeDefault ? 'bg-[#D36F2B]' : 'bg-border-strong'
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
                    <label className="block text-sm font-medium text-text-secondary dark:text-text-primary mb-2">
                      自定义 CSS（高级配置）
                    </label>
                    <textarea
                      value={formData.customCss}
                      onChange={(e) => setFormData({ ...formData, customCss: e.target.value })}
                      placeholder="/* 自定义样式 */"
                      rows={6}
                      className="w-full px-4 py-3 border border-border dark:border-border-strong rounded-8 bg-white dark:bg-background-base text-text-primary dark:text-text-primary focus:outline-none focus:border-[#D36F2B] resize-none font-mono text-sm"
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
