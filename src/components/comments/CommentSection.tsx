'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, ThumbsUp, Reply, ChevronDown, ChevronUp } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CommentAuthor {
  name: string
  avatar?: string
}

interface Comment {
  id: string
  authorName: string
  authorEmail?: string
  contentHtml: string
  createdAt: string
  depth: number
  parentId?: string
  rootId?: string
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
  className?: string
}

export const CommentSection: React.FC<CommentSectionProps> = ({ postId, className }) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    authorName: '',
    authorEmail: '',
    contentMd: '',
  })
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    fetchComments()
  }, [postId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/comments?postId=${postId}`)
      if (!res.ok) throw new Error('Failed to fetch comments')
      const data = await res.json()
      setComments(data.comments || [])
    } catch (err) {
      setError('评论加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.authorName.trim() || !formData.authorEmail.trim() || !formData.contentMd.trim()) return

    try {
      setSubmitting(true)
      const body: any = {
        postId,
        authorName: formData.authorName.trim(),
        authorEmail: formData.authorEmail.trim(),
        contentMd: formData.contentMd.trim(),
      }
      if (replyTo) {
        body.parentId = replyTo.id
      }

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit comment')
      }

      setFormData({ authorName: '', authorEmail: '', contentMd: '' })
      setReplyTo(null)
      setShowForm(false)
      alert('评论已提交，等待博主审核后显示')
    } catch (err: any) {
      alert(err.message || '评论提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = (commentId: string, authorName: string) => {
    setReplyTo({ id: commentId, name: authorName })
    setShowForm(true)
  }

  const renderComment = (comment: Comment, isReply = false) => {
    return (
      <div key={comment.id} className={cn('flex space-x-3', isReply && 'ml-8 md:ml-12')}>
        <Avatar fallback={comment.authorName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-text-primary dark:text-text-primary text-sm">
              {comment.authorName}
            </span>
            <span className="text-xs text-text-muted">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <div
            className="mt-1 text-sm text-text-secondary dark:text-text-secondary leading-relaxed prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: comment.contentHtml }}
          />
          <div className="mt-2 flex items-center space-x-3 text-xs text-text-muted">
            <button className="flex items-center space-x-1 hover:text-[#D36F2B] transition-colors">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>赞</span>
            </button>
            {comment.depth < 1 && (
              <button
                onClick={() => handleReply(comment.id, comment.authorName)}
                className="flex items-center space-x-1 hover:text-[#D36F2B] transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>回复</span>
              </button>
            )}
          </div>
          {/* 渲染回复 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-text-primary dark:text-text-primary flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span>评论 ({comments.length})</span>
        </h3>
        {!showForm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setReplyTo(null); setShowForm(true) }}
          >
            发表评论
          </Button>
        )}
      </div>

      {/* 评论表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 bg-background-base dark:bg-background-base rounded-xl border border-border dark:border-border-strong space-y-3">
          {replyTo && (
            <div className="flex items-center justify-between text-sm text-text-muted">
              <span>回复 @{replyTo.name}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-[#D36F2B] hover:underline"
              >
                取消回复
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="昵称 *"
              value={formData.authorName}
              onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
              className="px-3 py-2 text-sm bg-background-cream dark:bg-background-base border border-border-strong dark:border-border-strong rounded-lg focus:outline-none focus:border-[#D36F2B] transition-colors"
              required
            />
            <input
              type="email"
              placeholder="邮箱 *（不公开）"
              value={formData.authorEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, authorEmail: e.target.value }))}
              className="px-3 py-2 text-sm bg-background-cream dark:bg-background-base border border-border-strong dark:border-border-strong rounded-lg focus:outline-none focus:border-[#D36F2B] transition-colors"
              required
            />
          </div>
          <textarea
            placeholder="写下你的评论...（支持 Markdown）"
            value={formData.contentMd}
            onChange={(e) => setFormData(prev => ({ ...prev, contentMd: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 text-sm bg-background-cream dark:bg-background-base border border-border-strong dark:border-border-strong rounded-lg focus:outline-none focus:border-[#D36F2B] transition-colors resize-none"
            required
          />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setShowForm(false); setReplyTo(null) }}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !formData.authorName.trim() || !formData.authorEmail.trim() || !formData.contentMd.trim()}
            >
              {submitting ? '提交中...' : '提交评论'}
            </Button>
          </div>
        </form>
      )}

      {/* 评论列表 */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex space-x-3">
              <div className="w-8 h-8 rounded-full bg-background-hover dark:bg-background-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-background-hover dark:bg-background-hover rounded w-1/4" />
                <div className="h-3 bg-background-hover dark:bg-background-hover rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-text-muted">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchComments} className="mt-2">
            重试
          </Button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-text-secondary dark:text-text-secondary mx-auto mb-3" />
          <p className="text-text-muted">暂无评论，来说点什么吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  )
}
