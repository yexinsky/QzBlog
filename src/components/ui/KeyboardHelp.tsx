'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

interface KeyboardHelpProps {
  open: boolean
  onClose: () => void
}

export const KeyboardHelp: React.FC<KeyboardHelpProps> = ({ open, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="键盘快捷键"
    >
      <div className="bg-background-base border border-border rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">键盘快捷键</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-background-hover transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted">
                <th className="pb-3 font-medium">快捷键</th>
                <th className="pb-3 font-medium">功能</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.key} className="border-t border-border">
                  <td className="py-3 pr-4">
                    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded bg-background-hover border border-border text-xs font-mono text-text-primary">
                      {s.key}
                    </kbd>
                  </td>
                  <td className="py-3 text-text-secondary">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
