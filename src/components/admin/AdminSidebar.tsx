'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Image, BookOpen, FolderGit2, Clock, User, Settings, LayoutDashboard, PenTool, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: number
}

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: '仪表盘', href: '/admin' },
  { icon: PenTool, label: '文章管理', href: '/admin/posts' },
  { icon: Image, label: '动态管理', href: '/admin/moments' },
  { icon: MessageSquare, label: '评论管理', href: '/admin/comments' },
  { icon: User, label: '个人资料', href: '/admin/profile' },
]

interface AdminSidebarProps {
  className?: string
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ className }) => {
  const pathname = usePathname()

  return (
    <aside className={cn('w-64 bg-background-base border-r border-border min-h-screen', className)}>
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
          <span className="text-xl font-bold text-text-primary">管理后台</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {adminNavItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-button transition-colors',
                isActive
                  ? 'bg-brand-orange text-white'
                  : 'text-text-secondary hover:bg-background-hover'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="h-px bg-border my-4" />

        {/* Back to Site */}
        <Link
          href="/"
          className="flex items-center space-x-3 px-4 py-3 rounded-button text-text-secondary hover:bg-background-hover transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">返回前台</span>
        </Link>
      </nav>
    </aside>
  )
}