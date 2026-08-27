import type { Metadata } from 'next'
import { ThemeProvider } from '@/hooks/useTheme'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Qzhou Blog - 个人技术博客',
  description: '分享技术心得，记录成长历程',
  keywords: ['博客', '技术', 'Next.js', 'React', '前端开发'],
  authors: [{ name: 'Qzhou' }],
  openGraph: {
    title: 'Qzhou Blog',
    description: '分享技术心得，记录成长历程',
    type: 'website',
    locale: 'zh_CN',
  },
  twitter: {
    card: 'summary',
    title: 'Qzhou Blog',
    description: '分享技术心得，记录成长历程',
  },
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
