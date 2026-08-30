'use client'

import React, { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  /** 是否显示 */
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** danger 会将确认按钮渲染为红色系 */
  tone?: 'danger' | 'default'
  /** 确认请求进行中时锁定按钮 */
  loading?: boolean
  /** 额外表单内容（如分组命名输入框） */
  children?: React.ReactNode
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 页内确认弹窗：替代 window.confirm 原生对话框。
 * 支持 Escape 关闭与焦点管理，遮罩点击不关闭以防误触。
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  tone = 'default',
  loading = false,
  children,
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    confirmRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-card bg-background-base p-6 shadow-hover">
        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id="confirm-dialog-description" className="mt-1.5 text-sm text-text-secondary break-words">
                {description}
              </p>
            )}
          </div>
        </div>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            size="sm"
            loading={loading}
            onClick={onConfirm}
            className={tone === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white' : undefined}
            aria-label={confirmText}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
