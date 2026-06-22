'use client';

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AvatarCrop } from './AvatarCrop';
import { SignedImg } from './SignedImg';
import { Upload, X } from 'lucide-react';

interface AvatarUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  onClear?: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onChange,
  onClear,
  label = '博主头像',
  className,
  disabled = false,
}) => {
  const [isCropping, setIsCropping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 从 URL 或 key 中提取存储 key
  const extractStorageKey = (url: string): string | null => {
    if (url.startsWith('/') || !url.startsWith('http')) {
      return url;
    }
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.slice(1);
    } catch {
      return null;
    }
  };

  // 删除旧文件
  const deleteOldAvatar = async (key: string) => {
    try {
      await fetch(`/api/upload?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete old avatar:', e);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('文件大小不能超过 5MB');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsCropping(true);
    setError(null);

    e.target.value = '';
  }, []);

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploading(true);

    try {
      if (value) {
        const oldKey = extractStorageKey(value);
        if (oldKey) {
          await deleteOldAvatar(oldKey);
        }
      }

      const formData = new FormData();
      formData.append('file', croppedBlob, 'avatar.jpg');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '上传失败');
      }

      const data = await response.json();
      onChange(data.url);
      setError(null);

      setIsCropping(false);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  // 裁切界面
  if (isCropping) {
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label className="block text-sm font-medium text-text-primary dark:text-text-primary mb-2">
            {label}
          </label>
        )}
        <div className="relative p-6 bg-white dark:bg-background-base rounded-lg border border-border dark:border-border-strong">
          {previewUrl && (
            <AvatarCrop
              imageSrc={previewUrl}
              onCropComplete={handleCropComplete}
              onCancel={handleCancelCrop}
            />
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
              <div className="bg-white dark:bg-background-base rounded-lg p-6 flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-brand-orange mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm text-text-muted">上传中...</p>
              </div>
            </div>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* 隐藏的 file input - 始终存在于 DOM 中 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {label && (
        <label className="block text-sm font-medium text-text-primary dark:text-text-primary mb-2">
          {label}
        </label>
      )}

      {/* 有头像时显示预览 */}
      {value ? (
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-brand-orange/20 shadow-lg">
              <SignedImg
                src={value}
                alt="头像预览"
                className="w-full h-full object-cover"
              />
            </div>

            {!disabled && (
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="w-10 h-10 bg-white dark:bg-background-base rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-background-hover transition-colors"
                  title="重新上传（将覆盖当前头像）"
                >
                  <Upload className="w-5 h-5 text-text-primary" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-10 h-10 bg-white dark:bg-background-base rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-background-hover transition-colors"
                  title="删除"
                >
                  <X className="w-5 h-5 text-red-500" />
                </button>
              </div>
            )}
          </div>

          <p className="mt-3 text-sm text-text-muted text-center">
            点击图标重新上传头像（将覆盖当前头像）
          </p>
        </div>
      ) : (
        /* 无头像时显示上传区域 */
        <div
          className={cn(
            'border-2 border-dashed rounded-full p-8 text-center transition-colors cursor-pointer',
            'border-border dark:border-border-strong hover:border-brand-orange/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && triggerFileInput()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-brand-orange mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-text-muted">上传中...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-text-muted mb-2" />
              <p className="text-sm text-text-muted mb-1">点击上传头像</p>
              <p className="text-xs text-text-muted">支持 JPG、PNG、WebP</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
};
