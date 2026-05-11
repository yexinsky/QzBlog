import React from 'react'
import Link from 'next/link'
import { Calendar, Clock, Eye, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { TagCloud } from '@/components/ui/Tag'
import { formatDate, getReadingTime, truncate } from '@/lib/utils'

interface ArticleCardProps {
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
  variant?: 'default' | 'compact' | 'featured'
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  slug,
  title,
  excerpt,
  coverImage,
  publishedAt,
  readingTime,
  views,
  tags = [],
  author,
  variant = 'default'
}) => {
  if (variant === 'compact') {
    return (
      <Card className="group">
        <Link href={`/posts/${slug}`}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <h3 className="font-medium text-text-primary group-hover:text-brand-orange transition-colors line-clamp-2">
                {title}
              </h3>
              <div className="flex items-center space-x-3 text-xs text-text-muted">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(publishedAt)}</span>
                </span>
                {readingTime && (
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{readingTime} 分钟</span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="group overflow-hidden">
      {coverImage && (
        <div className="aspect-video overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 3).map(tag => (
                <Tag
                  key={tag.slug}
                  size="sm"
                  href={`/tags/${tag.slug}`}
                >
                  {tag.name}
                </Tag>
              ))}
            </div>
          )}

          {/* Title */}
          <Link href={`/posts/${slug}`}>
            <h3 className="text-xl font-semibold text-text-primary group-hover:text-brand-orange transition-colors line-clamp-2">
              {title}
            </h3>
          </Link>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed">
              {truncate(excerpt, 150)}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center space-x-4">
              {author && (
                <div className="flex items-center space-x-2">
                  <Avatar src={author.avatar} fallback={author.name} size="sm" />
                  <span className="text-sm text-text-secondary">{author.name}</span>
                </div>
              )}
              <span className="flex items-center space-x-1 text-xs text-text-muted">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(publishedAt)}</span>
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-text-muted">
              {readingTime && (
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{readingTime} 分钟</span>
                </span>
              )}
              {views !== undefined && (
                <span className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span>{views}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ArticleCardSkeletonProps {
  variant?: 'default' | 'compact'
}

export const ArticleCardSkeleton: React.FC<ArticleCardSkeletonProps> = ({ variant = 'default' }) => {
  if (variant === 'compact') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="h-5 bg-background-hover rounded animate-pulse" />
            <div className="h-3 bg-background-hover rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="aspect-video bg-background-hover animate-pulse" />
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="h-6 w-16 bg-background-hover rounded animate-pulse" />
            <div className="h-6 w-16 bg-background-hover rounded animate-pulse" />
          </div>
          <div className="h-7 bg-background-hover rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-background-hover rounded animate-pulse" />
            <div className="h-4 bg-background-hover rounded animate-pulse w-3/4" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-background-hover rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-background-hover rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}