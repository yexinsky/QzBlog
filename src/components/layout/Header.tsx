'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Moon, Sun, Menu, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { KeyboardHelp } from '@/components/ui/KeyboardHelp'

const navLinks = [
  { href: '/', label: '首页' },
  { href: '/moments', label: '动态' },
  { href: '/learning', label: '学习路线' },
  { href: '/projects', label: '项目展示' },
  { href: '/timeline', label: '时间线' },
  { href: '/about', label: '关于我' },
]

export const Header: React.FC = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { showHelp, setShowHelp } = useKeyboardShortcuts()

  // Listen for the custom event dispatched by useKeyboardShortcuts
  useEffect(() => {
    const handler = () => toggleTheme()
    window.addEventListener('keyboard-toggle-theme', handler)
    return () => window.removeEventListener('keyboard-toggle-theme', handler)
  }, [toggleTheme])

  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const q = searchQuery.trim()
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`)
      }
    },
    [searchQuery, router]
  )

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[name="q"], input[type="search"]'
    )
    if (input) input.focus()
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background-base/80 backdrop-blur-sm">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Q</span>
            </div>
            <span className="text-xl font-bold text-text-primary hidden sm:block">Qzhou Blog</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(link => {
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-button transition-colors',
                    isActive
                      ? 'bg-brand-orange text-white'
                      : 'text-text-secondary hover:bg-background-hover'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* Search Input - desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="w-40 lg:w-56 h-9 pl-9 pr-3 rounded-button bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </form>

            {/* Search Button - mobile */}
            <button
              onClick={focusSearch}
              className="md:hidden p-2 rounded-button hover:bg-background-hover transition-colors"
              aria-label="搜索"
            >
              <Search className="w-5 h-5 text-text-secondary" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-button hover:bg-background-hover transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-text-secondary" />
              ) : (
                <Moon className="w-5 h-5 text-text-secondary" />
              )}
            </button>

            {/* Admin Link */}
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium bg-brand-orange text-white rounded-button hover:bg-brand-dark transition-colors"
            >
              管理后台
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-button hover:bg-background-hover transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-text-secondary" />
              ) : (
                <Menu className="w-5 h-5 text-text-secondary" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="px-4 pb-3">
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索..."
                  className="w-full h-10 pl-9 pr-3 rounded-button bg-background-hover border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>
            </form>

            <div className="flex flex-col space-y-1">
              {navLinks.map(link => {
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      'px-4 py-3 text-sm font-medium rounded-button transition-colors',
                      isActive
                        ? 'bg-brand-orange text-white'
                        : 'text-text-secondary hover:bg-background-hover'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <Link
                href="/admin"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 text-sm font-medium bg-brand-orange text-white rounded-button text-center"
              >
                管理后台
              </Link>
            </div>
          </nav>
        )}
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </header>
  )
}
