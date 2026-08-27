import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section } from '@/components/layout/Container'

export const metadata = {
  title: '页面未找到 - Qzhou Blog',
  description: '您访问的页面不存在或已被移除。',
}

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <Section>
          <Container maxWidth="md">
            <div className="text-center py-16 space-y-6">
              <p className="text-7xl font-bold text-brand-orange">404</p>
              <h1 className="text-3xl font-bold text-text-primary">页面未找到</h1>
              <p className="text-text-secondary leading-relaxed">
                抱歉，您访问的页面不存在，或者已经被移除、修改。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/"
                  className="px-6 py-3 rounded-button bg-brand-orange text-white font-medium hover:bg-brand-dark transition-colors"
                >
                  返回首页
                </Link>
                <Link
                  href="/posts"
                  className="px-6 py-3 rounded-button border border-border-strong text-text-primary font-medium hover:bg-background-hover transition-colors"
                >
                  浏览文章
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
