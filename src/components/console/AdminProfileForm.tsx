'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'

export interface AdminProfile {
  username: string
  email: string
  avatarUrl: string | null
  bio: string | null
}

export function AdminProfileForm({ initialProfile }: { initialProfile: AdminProfile }) {
  const router = useRouter()
  const [profile, setProfile] = useState({
    username: initialProfile.username,
    email: initialProfile.email,
    avatarUrl: initialProfile.avatarUrl ?? '',
    bio: initialProfile.bio ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || '保存失败，请稍后重试')
      setProfile({
        username: data.user.username,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl ?? '',
        bio: data.user.bio ?? '',
      })
      setMessage({ type: 'success', text: '个人资料已保存' })
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败，请稍后重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="用户名" required maxLength={50} autoComplete="username" value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} />
      <Input label="邮箱" type="email" required maxLength={255} autoComplete="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
      <Input label="头像 URL" type="url" maxLength={500} placeholder="https://example.com/avatar.jpg" value={profile.avatarUrl} onChange={(event) => setProfile({ ...profile, avatarUrl: event.target.value })} />
      <Textarea label="简介" maxLength={2000} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
      {message && <p role="status" className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>{message.text}</p>}
      <Button type="submit" loading={loading}>保存资料</Button>
    </form>
  )
}
