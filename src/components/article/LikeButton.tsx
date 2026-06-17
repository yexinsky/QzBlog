'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  postId: string;
  initialCount: number;
  className?: string;
}

export const LikeButton: React.FC<LikeButtonProps> = ({ postId, initialCount, className }) => {
  const [count, setCount] = useState(initialCount);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = async () => {
    if (isLiked) return;

    setIsAnimating(true);
    setIsLiked(true);
    setCount(count + 1);

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (!response.ok) {
        // 如果失败，回滚状态
        setIsLiked(false);
        setCount(count);
      }
    } catch (error) {
      console.error('Like failed:', error);
      setIsLiked(false);
      setCount(count);
    } finally {
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLiked}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-8 border transition-all duration-200',
        isLiked
          ? 'bg-red-50 border-red-200 text-red-500'
          : 'bg-background-base dark:bg-background-base border-border dark:border-border-strong text-text-muted hover:border-red-300 hover:text-red-500',
        isAnimating && 'scale-110',
        className
      )}
    >
      <Heart
        className={cn(
          'w-5 h-5 transition-all duration-200',
          isLiked && 'fill-red-500',
          isAnimating && 'animate-bounce'
        )}
      />
      <span className="text-sm font-medium">{count}</span>
    </button>
  );
};
