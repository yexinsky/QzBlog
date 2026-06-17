'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background-cream">
      <Header />
      <main className="py-16">
        <Container maxWidth="lg">
          <div className="text-center">
            <div className="text-6xl mb-6">😥</div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary mb-4">
              出了一些问题
            </h1>
            <p className="text-text-muted mb-8 max-w-md mx-auto">
              抱歉，页面加载时遇到了错误。请尝试刷新页面或返回首页。
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={reset}
                className="inline-flex items-center px-6 py-3 bg-[#D36F2B] text-white rounded-lg hover:bg-[#B85D1F] transition-colors font-medium"
              >
                重试
              </button>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 border-border dark:border-border-strong text-text-secondary dark:text-text-secondary rounded-lg hover:bg-background-hover dark:hover:bg-background-hover transition-colors font-medium"
              >
                返回首页
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
