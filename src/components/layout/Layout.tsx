import React from 'react'
import { cn } from '@/lib/utils'

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4
  children: React.ReactNode
}

export const Grid: React.FC<GridProps> = ({ className, cols = 3, children, ...props }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn('grid gap-6', gridCols[cols], className)} {...props}>
      {children}
    </div>
  )
}

interface MainLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  showSidebar?: boolean
  sidebarWidth?: 'sm' | 'md' | 'lg'
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sidebar,
  showSidebar = true,
  sidebarWidth = 'md'
}) => {
  const sidebarWidthClass = {
    sm: 'w-full md:w-64 lg:w-72',
    md: 'w-full md:w-80 lg:w-96',
    lg: 'w-full md:w-96 lg:w-1/3'
  }

  if (!showSidebar || !sidebar) {
    return <div className="w-full">{children}</div>
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <main className="flex-1 min-w-0">{children}</main>
      <aside className={cn('lg:sticky lg:top-24 lg:h-fit', sidebarWidthClass[sidebarWidth])}>
        {sidebar}
      </aside>
    </div>
  )
}