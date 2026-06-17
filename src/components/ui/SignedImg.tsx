'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SignedImgProps {
  src: string; // 存储的 key 或完整 URL
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}

export const SignedImg: React.FC<SignedImgProps> = ({
  src,
  alt = '',
  className,
  fallback,
}) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const retryCountRef = useRef(0);
  const maxRetries = 2;

  const fetchSignedUrl = useCallback(async () => {
    // 如果 src 是完整的 HTTP URL，直接使用
    if (src.startsWith('http://') || src.startsWith('https://')) {
      setImgSrc(src);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/storage/signed-url?key=${encodeURIComponent(src)}`);
      if (response.ok) {
        const data = await response.json();
        setImgSrc(data.url);
        retryCountRef.current = 0; // 重置重试计数
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [src]);

  useEffect(() => {
    retryCountRef.current = 0;
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  // 图片加载失败时，重新获取签名 URL（处理签名过期的情况）
  const handleError = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      fetchSignedUrl();
    } else {
      setError(true);
    }
  }, [fetchSignedUrl]);

  if (isLoading) {
    return (
      <div className={cn('bg-gray-100 animate-pulse', className)}>
        {fallback}
      </div>
    );
  }

  if (error || !imgSrc) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn('bg-gray-100 flex items-center justify-center', className)}>
        <span className="text-gray-400 text-sm">图片加载失败</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};
