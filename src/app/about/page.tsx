import { db, schema } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container, Section, PageTitle } from '@/components/layout/Container';
import { Card, CardContent } from '@/components/ui/Card';
import { Github, Twitter, Linkedin, Globe, Mail, MapPin, Briefcase, Code, BookOpen, FolderOpen } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: '关于我 - QzBlog',
  description: '了解博主的个人信息、技能栈和工作经历',
};

export default async function AboutPage() {
  try {
    // 获取站点设置
    const settings = await db.query.siteSettings.findFirst();

    // 获取技能栈
    const skills = await db.query.skills.findMany({
      orderBy: [schema.skills.category, schema.skills.sortOrder],
    });

    // 获取社交链接
    const socialLinks = await db.query.socialLinks.findMany({
      where: eq(schema.socialLinks.isVisible, true),
      orderBy: schema.socialLinks.sortOrder,
    });

    // 获取工作经历
    const workExperience = await db.query.workExperience.findMany({
      orderBy: schema.workExperience.sortOrder,
    });

    // 获取统计数据
    const [postsCount, momentsCount, projectsCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.posts).where(eq(schema.posts.status, 'published')),
      db.select({ count: sql<number>`count(*)` }).from(schema.moments),
      db.select({ count: sql<number>`count(*)` }).from(schema.projects),
    ]);

    // 按分类分组技能
    const skillsByCategory = skills.reduce((acc, skill) => {
      const category = skill.category || '其他';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(skill);
      return acc;
    }, {} as Record<string, typeof skills>);

    // 社交链接图标映射
    const getSocialIcon = (platform: string) => {
      switch (platform.toLowerCase()) {
        case 'github':
          return <Github className="w-5 h-5" />;
        case 'twitter':
        case 'x':
          return <Twitter className="w-5 h-5" />;
        case 'linkedin':
          return <Linkedin className="w-5 h-5" />;
        case 'email':
          return <Mail className="w-5 h-5" />;
        default:
          return <Globe className="w-5 h-5" />;
      }
    };

    return (
      <div className="min-h-screen bg-background-cream">
        <Header />
        <main className="py-8">
          <Container maxWidth="4xl">
            <PageTitle title="关于我" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 左侧：个人信息 */}
              <div className="lg:col-span-1 space-y-6">
                {/* 头像卡片 */}
                <Card>
                  <CardContent className="p-6 text-center">
                    {settings?.avatarUrl ? (
                      <img
                        src={settings.avatarUrl}
                        alt={settings.siteName || '博主'}
                        className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full mx-auto mb-4 bg-brand-orange flex items-center justify-center text-white text-4xl font-bold">
                        Q
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-text-primary dark:text-text-primary mb-2">
                      {settings?.siteName || 'Qzhou'}
                    </h2>
                    <p className="text-text-muted mb-4">
                      {settings?.tagline || '全栈开发工程师'}
                    </p>

                    {/* 统计数据 */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border dark:border-border-strong">
                      <div>
                        <div className="text-2xl font-bold text-text-primary dark:text-text-primary">
                          {postsCount[0]?.count || 0}
                        </div>
                        <div className="text-sm text-text-muted">文章</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text-primary dark:text-text-primary">
                          {momentsCount[0]?.count || 0}
                        </div>
                        <div className="text-sm text-text-muted">动态</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text-primary dark:text-text-primary">
                          {projectsCount[0]?.count || 0}
                        </div>
                        <div className="text-sm text-text-muted">项目</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 社交链接 */}
                {socialLinks.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-text-primary dark:text-text-primary mb-4">社交链接</h3>
                      <div className="space-y-3">
                        {socialLinks.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 text-text-secondary dark:text-text-secondary hover:text-brand-orange transition-colors"
                          >
                            {getSocialIcon(link.platform)}
                            <span>{link.platform}</span>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 右侧：详细信息 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 个人简介 */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      个人简介
                    </h3>
                    <div className="prose prose-lg max-w-none dark:prose-invert">
                      {settings?.bio ? (
                        <p className="whitespace-pre-wrap">{settings.bio}</p>
                      ) : (
                        <p className="text-text-muted italic">暂无个人简介</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 技能栈 */}
                {Object.keys(skillsByCategory).length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary mb-4 flex items-center gap-2">
                        <Code className="w-5 h-5" />
                        技能栈
                      </h3>
                      <div className="space-y-6">
                        {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                          <div key={category}>
                            <h4 className="text-sm font-medium text-text-muted mb-3">{category}</h4>
                            <div className="flex flex-wrap gap-2">
                              {categorySkills.map((skill) => (
                                <span
                                  key={skill.id}
                                  className="px-3 py-1.5 text-sm rounded-full border transition-colors"
                                  style={{
                                    backgroundColor: skill.color ? `${skill.color}10` : undefined,
                                    borderColor: skill.color || '#D9D2C8',
                                    color: skill.color || '#444444',
                                  }}
                                >
                                  {skill.name}
                                  {skill.proficiency ? ` ${skill.proficiency}%` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 工作经历 */}
                {workExperience.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        工作经历
                      </h3>
                      <div className="space-y-4">
                        {workExperience.map((exp, index) => (
                          <div
                            key={exp.id}
                            className={`pb-4 ${
                              index < workExperience.length - 1
                                ? 'border-b border-border dark:border-border-strong'
                                : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-text-primary dark:text-text-primary">
                                  {exp.position}
                                </h4>
                                <p className="text-text-muted">{exp.company}</p>
                              </div>
                              <span className="text-sm text-text-muted">
                                {new Date(exp.startDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric' })}
                                {' - '}
                                {exp.endDate
                                  ? new Date(exp.endDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric' })
                                  : '至今'}
                              </span>
                            </div>
                            {exp.description && (
                              <p className="text-sm text-text-secondary dark:text-text-secondary">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error('Error loading about page:', error);
    return (
      <div className="min-h-screen bg-background-cream">
        <Header />
        <main className="py-8">
          <Container maxWidth="4xl">
            <PageTitle title="关于我" />
            <div className="text-center py-12 text-text-muted">
              <p>加载中...</p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }
}
