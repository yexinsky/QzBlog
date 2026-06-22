'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SignedImgProps {
  src: string; // 存储的 key 或完整 URL
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
}

// 内存缓存签名 URL（避免重复请求）
const signedUrlCache = new Map<string, string>();
// 正在请求中的 Promise 缓存（避免并发重复请求）
const pendingRequests = new Map<string, Promise<string | null>>();

export const SignedImg: React.FC<SignedImgProps> = ({
  src,
  alt = '',
  className,
  fallback,
}) => {
  // 如果是完整 URL 或缓存中有，直接使用，不显示 loading
  const cachedUrl = signedUrlCache.get(src);
  const isFullUrl = src.startsWith('http://') || src.startsWith('https://');
  const initialSrc = isFullUrl ? src : cachedUrl || '';

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [isLoading, setIsLoading] = useState(!initialSrc);
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

    // 检查缓存
    const cached = signedUrlCache.get(src);
    if (cached) {
      setImgSrc(cached);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // 检查是否有正在进行的请求
      let requestPromise = pendingRequests.get(src);
      if (!requestPromise) {
        requestPromise = fetch(`/api/storage/signed-url?key=${encodeURIComponent(src)}`)
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              // 缓存签名 URL（缓存 50 分钟，签名 URL 通常 1 小时有效）
              signedUrlCache.set(src, data.url);
              return data.url as string;
            }
            return null;
          })
          .finally(() => {
            pendingRequests.delete(src);
          });
        pendingRequests.set(src, requestPromise);
      }

      const url = await requestPromise;
      if (url) {
        setImgSrc(url);
        retryCountRef.current = 0;
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
    // 如果已经有缓存或完整 URL，跳过请求
    if (isFullUrl || signedUrlCache.has(src)) {
      if (isFullUrl) {
        setImgSrc(src);
      } else {
        setImgSrc(signedUrlCache.get(src) || '');
      }
      setIsLoading(false);
      return;
    }

    retryCountRef.current = 0;
    fetchSignedUrl();
  }, [src, isFullUrl, fetchSignedUrl]);

  // 图片加载失败时，重新获取签名 URL（处理签名过期的情况）
  const handleError = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      // 清除缓存，重新获取
      signedUrlCache.delete(src);
      fetchSignedUrl();
    } else {
      setError(true);
    }
  }, [fetchSignedUrl, src]);

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
