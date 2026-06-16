'use client';

import React from 'react';
import { Share2, Twitter, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareButtonsProps {
  title: string;
  slug: string;
  className?: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ title, slug, className }) => {
  const url = typeof window !== 'undefined' ? `${window.location.origin}/posts/${slug}` : '';

  const shareToTwitter = () => {
    const text = encodeURIComponent(title);
    const shareUrl = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${shareUrl}`, '_blank');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('链接已复制');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={shareToTwitter}
        className="flex items-center gap-2 px-3 py-2 text-sm text-[#777777] hover:text-[#1DA1F2] hover:bg-blue-50 rounded-8 transition-colors"
        title="分享到 Twitter"
      >
        <Twitter className="w-4 h-4" />
        <span className="hidden sm:inline">Twitter</span>
      </button>
      <button
        onClick={copyLink}
        className="flex items-center gap-2 px-3 py-2 text-sm text-[#777777] hover:text-[#444444] hover:bg-[#EBE7E0] rounded-8 transition-colors"
        title="复制链接"
      >
        <LinkIcon className="w-4 h-4" />
        <span className="hidden sm:inline">复制链接</span>
      </button>
    </div>
  );
};
