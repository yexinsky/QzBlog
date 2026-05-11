'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
  className?: string
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  filename,
  showLineNumbers = false,
  className
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const lines = code.split('\n')

  return (
    <div className={cn('relative group rounded-card overflow-hidden bg-[#1e1e1e] dark:bg-[#0d1117]', className)}>
      {/* Header */}
      {(filename || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#404040]">
          <div className="flex items-center space-x-2">
            {filename && (
              <span className="text-sm text-gray-300 font-medium">{filename}</span>
            )}
            {language && !filename && (
              <span className="text-xs text-gray-400 uppercase">{language}</span>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-[#404040] transition-colors"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>复制</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Code Content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code className={language ? `language-${language}` : ''}>
            {showLineNumbers ? (
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="hover:bg-[#ffffff08]">
                      <td className="select-none pr-4 text-gray-600 text-right w-10">
                        {index + 1}
                      </td>
                      <td className="text-gray-300">
                        <span dangerouslySetInnerHTML={{ __html: escapeHtml(line) || '&nbsp;' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span dangerouslySetInnerHTML={{ __html: escapeHtml(code) }} />
            )}
          </code>
        </pre>
      </div>

      {/* Copy Button (when no header) */}
      {!filename && !language && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 rounded opacity-0 group-hover:opacity-100 bg-[#404040] hover:bg-[#505050] transition-all"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      )}
    </div>
  )
}

// Simple HTML escaping function
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface InlineCodeProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
}

export const InlineCode: React.FC<InlineCodeProps> = ({ className, children, ...props }) => {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 bg-[#f5f2ee] dark:bg-[#2d2d2d] text-brand-orange dark:text-[#e88b45] rounded text-sm font-mono',
        className
      )}
      {...props}
    >
      {children}
    </code>
  )
}