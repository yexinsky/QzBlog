'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X, ChevronLeft, ChevronRight, AlertCircle, BookOpen } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { ArticleCard, ArticleCardSkeleton } from '@/components/article/ArticleCard'
import { cn } from '@/lib/utils'

interface SearchPost {
  id: string
  title: string
  slug: string
  summary: string
  coverImage: string | null
  publishedAt: string | null
  wordCount: number
  likeCount: number
  viewCount: number
  createdAt: string
  author: {
    id: string
    username: string
    avatarUrl: string | null
  }
  tags: Array<{ name: string; slug: string }>
}

interface SearchPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface SearchSuggestion {
  title: string
  slug: string
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [inputValue, setInputValue] = useState(initialQuery)
  const [posts, setPosts] = useState<SearchPost[]>([])
  const [pagination, setPagination] = useState<SearchPagination | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const LIMIT = 10

  // Fetch search results
  const fetchResults = useCallback(async (keyword: string, page: number) => {
    if (!keyword.trim()) {
      setPosts([])
      setPagination(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        keyword: keyword.trim(),
        page: String(page),
        limit: String(LIMIT),
      })

      const response = await fetch(`/api/posts?${params.toString()}`)

      if (!response.ok) {
        throw new Error('搜索请求失败')
      }

      const data = await response.json()
      setPosts(data.posts || [])
      setPagination(data.pagination || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索时发生错误')
      setPosts([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch suggestions for real-time autocomplete
  const fetchSuggestions = useCallback(async (keyword: string) => {
    if (!keyword.trim() || keyword.trim().length < 1) {
      setSuggestions([])
      return
    }

    setSuggestionsLoading(true)

    try {
      const params = new URLSearchParams({
        keyword: keyword.trim(),
        page: '1',
        limit: '5',
      })

      const response = await fetch(`/api/posts?${params.toString()}`)

      if (!response.ok) return

      const data = await response.json()
      const results: SearchSuggestion[] = (data.posts || []).map(
        (post: SearchPost) => ({
          title: post.title,
          slug: post.slug,
        })
      )
      setSuggestions(results)
    } catch {
      // Silently fail for suggestions
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  // Update URL when query changes
  const updateUrl = useCallback(
    (q: string) => {
      const params = new URLSearchParams()
      if (q.trim()) {
        params.set('q', q.trim())
      }
      const newUrl = params.toString() ? `/search?${params.toString()}` : '/search'
      router.push(newUrl, { scroll: false })
    },
    [router]
  )

  // Handle search submit
  const handleSearch = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim()
      setQuery(trimmed)
      setCurrentPage(1)
      setShowSuggestions(false)
      updateUrl(trimmed)
      fetchResults(trimmed, 1)
    },
    [fetchResults, updateUrl]
  )

  // Handle input change with debounced suggestions
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value)

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (value.trim()) {
        debounceTimerRef.current = setTimeout(() => {
          fetchSuggestions(value)
          setShowSuggestions(true)
        }, 300)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    },
    [fetchSuggestions]
  )

  // Handle input key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSearch(inputValue)
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
        inputRef.current?.blur()
      }
    },
    [inputValue, handleSearch]
  )

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      setInputValue(suggestion.title)
      handleSearch(suggestion.title)
    },
    [handleSearch]
  )

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page)
      fetchResults(query, page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [query, fetchResults]
  )

  // Clear search
  const handleClear = useCallback(() => {
    setInputValue('')
    setQuery('')
    setPosts([])
    setPagination(null)
    setSuggestions([])
    setShowSuggestions(false)
    updateUrl('')
    inputRef.current?.focus()
  }, [updateUrl])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Initial search from URL
  useEffect(() => {
    if (initialQuery) {
      fetchResults(initialQuery, 1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const totalPages = pagination?.totalPages || 0
  const hasResults = posts.length > 0
  const isEmpty = !loading && query.trim() !== '' && !hasResults && !error
  const showInitial = !loading && !query.trim()

  return (
    <Container maxWidth="xl" className="py-8 md:py-12">
      {/* Search Input */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0 && inputValue.trim()) {
                  setShowSuggestions(true)
                }
              }}
              placeholder="搜索文章...（按 / 聚焦）"
              className={cn(
                'w-full pl-12 pr-12 py-4 text-lg',
                'bg-background-base border border-border rounded-card',
                'text-text-primary placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent',
                'transition-all duration-200'
              )}
            />
            {inputValue && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background-hover transition-colors"
                aria-label="清除搜索"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && (suggestions.length > 0 || suggestionsLoading) && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-2 bg-background-base border border-border rounded-card shadow-lg overflow-hidden"
            >
              {suggestionsLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-5 bg-background-hover rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <ul>
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.slug}>
                      <button
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 text-left hover:bg-background-hover transition-colors flex items-center space-x-3"
                      >
                        <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
                        <span className="text-sm text-text-primary truncate">
                          {suggestion.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {showInitial && (
        <div className="text-center py-16">
          <Search className="w-16 h-16 mx-auto text-text-muted/40 mb-4" />
          <p className="text-text-muted text-lg">输入关键词搜索文章</p>
          <p className="text-text-muted/60 text-sm mt-2">支持标题和摘要模糊匹配</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <p className="text-text-muted text-sm">搜索中...</p>
          </div>
          {[...Array(3)].map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="max-w-md mx-auto text-center py-16">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-text-primary font-medium mb-2">搜索出错</p>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchResults(query, currentPage)}
            className="px-4 py-2 bg-brand-orange text-white rounded-button hover:bg-brand-dark transition-colors text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 mx-auto text-text-muted/40 mb-4" />
          <p className="text-text-primary text-lg font-medium mb-2">未找到相关内容</p>
          <p className="text-text-muted text-sm">
            尝试使用其他关键词搜索，或浏览以下热门文章
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && hasResults && (
        <>
          {/* Results Count */}
          <div className="mb-6">
            <p className="text-sm text-text-muted">
              共找到 <span className="font-medium text-text-primary">{pagination?.total || 0}</span> 篇相关文章
            </p>
          </div>

          {/* Results List */}
          <div className="space-y-6">
            {posts.map((post) => (
              <ArticleCard
                key={post.id}
                slug={post.slug}
                title={post.title}
                excerpt={post.summary}
                coverImage={post.coverImage || undefined}
                publishedAt={post.publishedAt || post.createdAt}
                readingTime={post.wordCount ? Math.ceil(post.wordCount / 300) : undefined}
                views={post.viewCount}
                tags={post.tags}
                author={
                  post.author
                    ? {
                        name: post.author.username,
                        avatar: post.author.avatarUrl || undefined,
                      }
                    : undefined
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-10">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={cn(
                  'p-2 rounded-button transition-colors',
                  currentPage <= 1
                    ? 'text-text-muted/40 cursor-not-allowed'
                    : 'text-text-secondary hover:bg-background-hover'
                )}
                aria-label="上一页"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1
                const isCurrent = page === currentPage
                const showPage =
                  totalPages <= 7 ||
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1

                if (!showPage) {
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-2 text-text-muted">
                        ...
                      </span>
                    )
                  }
                  return null
                }

                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={cn(
                      'min-w-[40px] h-10 rounded-button text-sm font-medium transition-colors',
                      isCurrent
                        ? 'bg-brand-orange text-white'
                        : 'text-text-secondary hover:bg-background-hover'
                    )}
                  >
                    {page}
                  </button>
                )
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={cn(
                  'p-2 rounded-button transition-colors',
                  currentPage >= totalPages
                    ? 'text-text-muted/40 cursor-not-allowed'
                    : 'text-text-secondary hover:bg-background-hover'
                )}
                aria-label="下一页"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Hot Articles (shown on initial state or empty state) */}
      {(showInitial || isEmpty) && <HotArticles />}
    </Container>
  )
}

// Hot articles component for empty/initial state
function HotArticles() {
  const [hotPosts, setHotPosts] = useState<SearchPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHot = async () => {
      try {
        const response = await fetch('/api/posts?page=1&limit=5')
        if (response.ok) {
          const data = await response.json()
          setHotPosts(data.posts || [])
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchHot()
  }, [])

  if (loading || hotPosts.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-text-primary mb-4">热门文章</h2>
      <div className="space-y-3">
        {hotPosts.map((post) => (
          <ArticleCard
            key={post.id}
            slug={post.slug}
            title={post.title}
            excerpt={post.summary}
            publishedAt={post.publishedAt || post.createdAt}
            readingTime={post.wordCount ? Math.ceil(post.wordCount / 300) : undefined}
            views={post.viewCount}
            tags={post.tags}
            variant="compact"
          />
        ))}
      </div>
    </div>
  )
}
