'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section } from '@/components/layout/Container'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 上报错误到日志/监控
    console.error('Page error boundary caught:', error)
  }, [error])

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <Section>
          <Container maxWidth="md">
            <div className="text-center py-16 space-y-6">
              <p className="text-7xl font-bold text-brand-orange">500</p>
              <h1 className="text-3xl font-bold text-text-primary">出错了</h1>
              <p className="text-text-secondary leading-relaxed">
                页面加载时发生了一个意料之外的错误，您可以尝试刷新或返回首页。
              </p>
              {error.digest && (
                <p className="text-xs text-text-muted">
                  错误代码：{error.digest}
                </p>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => reset()}
                  className="px-6 py-3 rounded-button bg-brand-orange text-white font-medium hover:bg-brand-dark transition-colors"
                >
                  重试
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 rounded-button border border-border-strong text-text-primary font-medium hover:bg-background-hover transition-colors"
                >
                  返回首页
                </Link>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}
