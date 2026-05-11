import React from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary'
  size?: 'sm' | 'md'
  href?: string
  children: React.ReactNode
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant = 'default', size = 'md', href, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-button transition-all duration-200 ease-in-out'

    const variants = {
      default: 'bg-background-hover text-text-secondary hover:bg-brand-orange hover:text-white',
      primary: 'bg-brand-orange text-white',
      secondary: 'bg-background-hover text-text-primary border border-border'
    }

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm'
    }

    const tagClasses = cn(baseStyles, variants[variant], sizes[size], className)

    if (href) {
      return (
        <Link href={href} className={tagClasses} {...props}>
          {children}
        </Link>
      )
    }

    return (
      <span ref={ref} className={tagClasses} {...props}>
        {children}
      </span>
    )
  }
)

Tag.displayName = 'Tag'

interface TagCloudProps {
  tags: Array<{ name: string; count?: number; href?: string }>
  size?: 'sm' | 'md'
  className?: string
}

export const TagCloud: React.FC<TagCloudProps> = ({ tags, size = 'md', className }) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag, index) => (
        <Tag key={index} size={size} href={tag.href}>
          {tag.name}
          {tag.count !== undefined && <span className="ml-1 opacity-60">({tag.count})</span>}
        </Tag>
      ))}
    </div>
  )
}