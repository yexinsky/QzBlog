import type { Metadata } from 'next'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/Toast'
import { getSiteSettings } from '@/lib/settings'
// KaTeX 数学公式样式（文章/预览中的 $...$ 与 $$...$$ 渲染必需）
import 'katex/dist/katex.min.css'
// highlight.js 代码高亮主题；暗色模式的覆盖见 globals.css
import 'highlight.js/styles/github.css'
import './globals.css'

// v1.1（PRD 11.10）：站点关键词输出至 meta keywords 与 Open Graph；
// 「屏蔽搜索引擎」开启时全站 noindex（配合 robots.txt 全站 Disallow）。
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const keywords = settings.seoKeywords
    ? settings.seoKeywords.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
    : ['博客', '技术', 'Next.js', 'React', '前端开发']
  const blocked = settings.blockSearchEngine

  return {
    title: 'Qzhou Blog - 个人技术博客',
    description: settings.siteDescription ?? '分享技术心得，记录成长历程',
    keywords,
    authors: [{ name: 'Qzhou' }],
    robots: blocked ? { index: false, follow: false } : undefined,
    openGraph: {
      title: settings.siteName,
      description: settings.siteDescription ?? '分享技术心得，记录成长历程',
      type: 'website',
      locale: 'zh_CN',
    },
    twitter: {
      card: 'summary',
      title: settings.siteName,
      description: settings.siteDescription ?? '分享技术心得，记录成长历程',
    },
  }
}

// Inline bootstrap script: runs synchronously in <head> before paint, reads the
// persisted theme preference and applies the matching class to <html>. This lets
// the CSS variables defined in globals.css resolve to the correct values on the
// very first frame, so there is no light-to-dark (or dark-to-light) flash. It also
// prevents hydration mismatch because <html>'s class attribute is suppressed.
const themeBootstrap = `(function(){try{var k='qzhou-blog-theme';var s=localStorage.getItem(k);var t=(s==='light'||s==='dark')?s:'light';var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
