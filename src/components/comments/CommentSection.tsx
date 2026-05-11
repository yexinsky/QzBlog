'use client'

import React from 'react'
import Link from 'next/link'
import { MessageCircle, ThumbsUp, Eye, Share2, Bookmark } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Comment {
  id: string
  author: {
    name: string
    avatar?: string
  }
  content: string
  createdAt: string
  likes: number
}

interface CommentSectionProps {
  comments: Comment[]
  className?: string
}

export const CommentSection: React.FC<CommentSectionProps> = ({ comments, className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      <h3 className="text-2xl font-bold text-text-primary flex items-center space-x-2">
        <MessageCircle className="w-6 h-6" />
        <span>评论 ({comments.length})</span>
      </h3>

      <div className="space-y-6">
        {comments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-center py-8 text-text-muted">
          暂无评论，来抢沙发吧！
        </p>
      )}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  isReply?: boolean
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, isReply = false }) => {
  return (
    <div className={cn('flex space-x-4', isReply && 'ml-12')}>
      <Avatar src={comment.author.avatar} fallback={comment.author.name} size="md" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-text-primary">{comment.author.name}</span>
          <span className="text-xs text-text-muted">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-text-secondary leading-relaxed">{comment.content}</p>
        <div className="flex items-center space-x-4 text-sm">
          <button className="flex items-center space-x-1 text-text-muted hover:text-brand-orange transition-colors">
            <ThumbsUp className="w-4 h-4" />
            <span>{comment.likes}</span>
          </button>
          <button className="text-text-muted hover:text-brand-orange transition-colors">
            回复
          </button>
        </div>
      </div>
    </div>
  )
}

interface PostActionsProps {
  likes?: number
  views?: number
  className?: string
}

export const PostActions: React.FC<PostActionsProps> = ({ likes = 0, views = 0, className }) => {
  return (
    <div className={cn('flex items-center justify-between py-4 border-y border-border', className)}>
      <div className="flex items-center space-x-4 text-sm text-text-muted">
        <span className="flex items-center space-x-1">
          <Eye className="w-4 h-4" />
          <span>{views} 阅读</span>
        </span>
        <span className="flex items-center space-x-1">
          <ThumbsUp className="w-4 h-4" />
          <span>{likes} 赞</span>
        </span>
        <span className="flex items-center space-x-1">
          <MessageCircle className="w-4 h-4" />
          <span>评论</span>
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">
          <Share2 className="w-4 h-4 mr-1" />
          分享
        </Button>
        <Button variant="ghost" size="sm">
          <Bookmark className="w-4 h-4 mr-1" />
          收藏
        </Button>
      </div>
    </div>
  )
}