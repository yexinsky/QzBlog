import { ReactNode } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background-cream">
      <AdminSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
