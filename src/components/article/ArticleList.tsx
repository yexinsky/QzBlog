import React from 'react'
import { ArticleCard, ArticleCardSkeleton } from './ArticleCard'
import { cn } from '@/lib/utils'

interface ArticleListProps {
  articles: Array<{
    slug: string
    title: string
    excerpt?: string
    coverImage?: string
    publishedAt: string
    readingTime?: number
    views?: number
    tags?: Array<{ name: string; slug: string }>
    author?: {
      name: string
      avatar?: string
    }
  }>
  loading?: boolean
  emptyMessage?: string
  className?: string
  variant?: 'grid' | 'list'
  cols?: 1 | 2 | 3
}

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  loading = false,
  emptyMessage = '暂无文章',
  className,
  variant = 'grid',
  cols = 3
}) => {
  if (loading) {
    return (
      <div className={cn(
        variant === 'grid'
          ? 'grid gap-6'
          : 'space-y-4',
        className
      )}>
        {Array.from({ length: 3 }).map((_, index) => (
          <ArticleCardSkeleton key={index} variant={variant === 'list' ? 'compact' : 'default'} />
        ))}
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn(
      variant === 'grid'
        ? `grid gap-6 ${cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`
        : 'space-y-4',
      className
    )}>
      {articles.map(article => (
        <ArticleCard
          key={article.slug}
          {...article}
          variant={variant === 'list' ? 'compact' : 'default'}
        />
      ))}
    </div>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className
}) => {
  if (totalPages <= 1) return null

  const getPages = () => {
    const pages: Array<number | string> = []
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }
    return pages
  }

  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-button text-sm font-medium bg-background-base border border-border hover:bg-background-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        上一页
      </button>

      <div className="flex items-center space-x-1">
        {getPages().map((page, index) => (
          <span key={index}>
            {page === '...' ? (
              <span className="px-3 py-2 text-text-muted">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={cn(
                  'w-10 h-10 rounded-button text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-brand-orange text-white'
                    : 'bg-background-base border border-border hover:bg-background-hover'
                )}
              >
                {page}
              </button>
            )}
          </span>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-button text-sm font-medium bg-background-base border border-border hover:bg-background-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        下一页
      </button>
    </div>
  )
}