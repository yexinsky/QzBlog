import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: boolean
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, animation = true, style, ...props }, ref) => {
    const baseStyles = 'bg-background-hover'

    const variants = {
      text: 'h-4 rounded',
      circular: 'rounded-avatar',
      rectangular: 'rounded-card'
    }

    const animationClass = animation ? 'animate-pulse' : ''

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], animationClass, className)}
        style={{
          width: width,
          height: height,
          ...style
        }}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

interface SkeletonTextProps {
  lines?: number
  className?: string
  lastLineWidth?: string
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className,
  lastLineWidth = '60%'
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

SkeletonText.displayName = 'SkeletonText'

interface SkeletonCardProps {
  showAvatar?: boolean
  className?: string
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ showAvatar = true, className }) => {
  return (
    <div className={cn('p-6 bg-background-base rounded-card space-y-4', className)}>
      <div className="flex items-center space-x-4">
        {showAvatar && <Skeleton variant="circular" width={48} height={48} />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="60%" height={12} />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex space-x-2">
        <Skeleton variant="rectangular" width={80} height={24} />
        <Skeleton variant="rectangular" width={60} height={24} />
      </div>
    </div>
  )
}

SkeletonCard.displayName = 'SkeletonCard'