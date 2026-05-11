import React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  rounded?: boolean
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt = 'Avatar', size = 'md', fallback, rounded = true, ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8 text-sm',
      md: 'w-12 h-12 text-base',
      lg: 'w-16 h-16 text-xl',
      xl: 'w-24 h-24 text-2xl'
    }

    const getInitials = (name: string) => {
      return name.slice(0, 2).toUpperCase()
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center overflow-hidden bg-brand-orange text-white font-medium',
          sizes[size],
          rounded && 'rounded-avatar',
          className
        )}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : fallback ? (
          getInitials(fallback)
        ) : (
          <span>{alt[0]?.toUpperCase()}</span>
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ children, max = 4, size = 'md', className }) => {
  const childArray = React.Children.toArray(children)
  const visibleChildren = childArray.slice(0, max)
  const remainingCount = childArray.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleChildren.map((child, index) => (
        <div key={index} className="ring-2 ring-background-base rounded-avatar">
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'inline-flex items-center justify-center bg-background-hover text-text-secondary font-medium ring-2 ring-background-base rounded-avatar',
            size === 'sm' && 'w-8 h-8 text-xs',
            size === 'md' && 'w-12 h-12 text-sm',
            size === 'lg' && 'w-16 h-16 text-base'
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}