import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-cream">
      <Header />
      <main className="py-16">
        <Container maxWidth="lg">
          <div className="text-center">
            <h1 className="text-9xl font-bold text-[#D36F2B] mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-text-primary dark:text-text-primary mb-4">
              页面未找到
            </h2>
            <p className="text-text-muted mb-8 max-w-md mx-auto">
              你访问的页面不存在或已被移除，请检查 URL 是否正确。
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-[#D36F2B] text-white rounded-lg hover:bg-[#B85D1F] transition-colors font-medium"
            >
              返回首页
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
