'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogIn, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Container, Section } from '@/components/layout/Container'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams.get('callbackUrl')
  const callbackUrl = rawCallbackUrl?.startsWith('/admin') && !rawCallbackUrl.startsWith('//') && !rawCallbackUrl.includes('\\')
    ? rawCallbackUrl
    : '/admin'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const csrfRes = await fetch('/api/auth/csrf')
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData?.csrfToken

      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username,
          password,
          csrfToken: csrfToken ?? '',
          callbackUrl,
          json: 'true',
        }).toString(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || data?.message || '登录失败，请检查用户名和密码。')
      }
      router.push(data?.url || callbackUrl)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请稍后重试。'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section>
          <Container maxWidth="sm">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-text-secondary hover:text-brand-orange mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回首页
            </Link>

            <div className="bg-background-base rounded-card shadow-card p-6 md:p-8">
              <header className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-orange text-white mb-3">
                  <LogIn className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">管理员登录</h1>
                <p className="text-sm text-text-muted mt-2">输入凭据以管理后台</p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="请输入用户名"
                />
                <Input
                  type="password"
                  label="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="请输入密码"
                />

                {error && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-button">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} className="w-full">
                  {loading ? '正在登录…' : '登录'}
                </Button>
              </form>

              <p className="text-center text-xs text-text-muted mt-6">
                没有账号？请联系系统管理员。
              </p>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}



