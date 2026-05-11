import React from 'react'
import { cn } from '@/lib/utils'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  children: React.ReactNode
}

export const Container: React.FC<ContainerProps> = ({
  className,
  maxWidth = 'xl',
  children,
  ...props
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full'
  }

  return (
    <div
      className={cn(
        'mx-auto px-page-mobile md:px-page-tablet lg:px-page-desktop',
        maxWidthClasses[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const Section: React.FC<SectionProps> = ({ className, children, ...props }) => {
  return (
    <section
      className={cn('py-8 md:py-12', className)}
      {...props}
    >
      {children}
    </section>
  )
}

interface PageTitleProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export const PageTitle: React.FC<PageTitleProps> = ({ title, description, children }) => {
  return (
    <div className="mb-8">
      <h1 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight mb-4">
        {title}
      </h1>
      {description && (
        <p className="text-lg text-text-secondary leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}