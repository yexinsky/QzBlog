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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
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