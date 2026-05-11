'use client'

import React, { useState, useEffect } from 'react'
import { List, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  items: TocItem[]
  className?: string
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items, className }) => {
  const [activeId, setActiveId] = useState<string>('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-80px 0px -80% 0px',
        threshold: 0
      }
    )

    items.forEach(item => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [items])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const offset = 80
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      })
      setActiveId(id)
    }
  }

  if (items.length === 0) return null

  return (
    <nav className={cn('bg-background-base rounded-card shadow-card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary flex items-center space-x-2">
          <List className="w-4 h-4" />
          <span>目录</span>
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-background-hover transition-colors"
          aria-label={isCollapsed ? '展开目录' : '收起目录'}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          )}
        </button>
      </div>

      {/* TOC Items */}
      {!isCollapsed && (
        <div className="space-y-1">
          {items.map((item, index) => (
            <a
              key={index}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={cn(
                'block text-sm py-1.5 px-3 rounded transition-colors truncate',
                activeId === item.id
                  ? 'text-brand-orange font-medium bg-brand-orange/10'
                  : 'text-text-secondary hover:text-brand-orange hover:bg-brand-orange/5',
                item.level === 1 && 'font-medium',
                item.level === 2 && 'pl-6',
                item.level === 3 && 'pl-10'
              )}
            >
              {item.text}
            </a>
          ))}
        </div>
      )}
    </nav>
  )
}

// Helper function to extract TOC from markdown content
export function extractTocFromMarkdown(markdown: string): TocItem[] {
  const toc: TocItem[] = []
  const lines = markdown.split('\n')

  lines.forEach(line => {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text.toLowerCase().replace(/[^\w一-龥]+/g, '-')
      toc.push({ id, text, level })
    }
  })

  return toc
}