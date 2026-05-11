'use client'

import React, { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  showLineNumbers?: boolean
  disabled?: boolean
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = '在这里编写 Markdown...',
  className,
  minHeight = '400px',
  showLineNumbers = true,
  disabled = false
}) => {
  const { theme } = useTheme()

  const handleChange = useCallback((val: string) => {
    onChange(val)
  }, [onChange])

  const extensions = [
    markdown(),
    languages
  ]

  const editorTheme = theme === 'dark' ? oneDark : undefined

  return (
    <div className={cn('border border-border rounded-card overflow-hidden', className)}>
      <CodeMirror
        value={value}
        height={minHeight}
        extensions={extensions}
        theme={editorTheme}
        onChange={handleChange}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: showLineNumbers,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightSelectionMatches: true
        }}
        editable={!disabled}
        className="text-base"
        style={{
          fontSize: '14px'
        }}
      />
    </div>
  )
}

interface MarkdownEditorToolbarProps {
  onInsert: (text: string, placeholder?: string) => void
  className?: string
}

export const MarkdownEditorToolbar: React.FC<MarkdownEditorToolbarProps> = ({ onInsert, className }) => {
  const tools = [
    { label: 'H1', action: () => onInsert('# ', '标题1'), title: '标题1' },
    { label: 'H2', action: () => onInsert('## ', '标题2'), title: '标题2' },
    { label: 'H3', action: () => onInsert('### ', '标题3'), title: '标题3' },
    { type: 'divider' },
    { label: 'B', action: () => onInsert('**', '粗体文字'), title: '粗体', bold: true },
    { label: 'I', action: () => onInsert('*', '斜体文字'), title: '斜体', italic: true },
    { label: 'S', action: () => onInsert('~~', '删除线文字'), title: '删除线', strikethrough: true },
    { type: 'divider' },
    { label: '链接', action: () => onInsert('[', '链接文字'), title: '链接' },
    { label: '图片', action: () => onInsert('![', '图片alt'), title: '图片' },
    { label: '代码', action: () => onInsert('`', '代码'), title: '行内代码' },
    { label: '代码块', action: () => onInsert('\n```\n\n```\n', '代码块'), title: '代码块' },
    { type: 'divider' },
    { label: '引用', action: () => onInsert('> ', '引用内容'), title: '引用' },
    { label: '列表', action: () => onInsert('- ', '列表项'), title: '无序列表' },
    { label: '有序列表', action: () => onInsert('1. ', '列表项'), title: '有序列表' },
    { label: '任务', action: () => onInsert('- [ ] ', '任务项'), title: '任务列表' },
    { type: 'divider' },
    { label: '表格', action: () => onInsert('\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n', '表格'), title: '表格' },
  ]

  return (
    <div className={cn('flex items-center flex-wrap gap-1 p-2 border-b border-border bg-background-cream', className)}>
      {tools.map((tool, index) => {
        if (tool.type === 'divider') {
          return <div key={index} className="w-px h-6 bg-border mx-1" />
        }

        return (
          <button
            key={index}
            onClick={tool.action}
            className="px-2 py-1 text-sm font-medium text-text-secondary hover:bg-background-hover rounded transition-colors"
            style={{
              fontWeight: tool.bold ? 'bold' : undefined,
              fontStyle: tool.italic ? 'italic' : undefined,
              textDecoration: tool.strikethrough ? 'line-through' : undefined
            }}
            title={tool.title}
          >
            {tool.label}
          </button>
        )
      })}
    </div>
  )
}

interface MarkdownEditorWithToolbarProps extends MarkdownEditorProps {
  showToolbar?: boolean
}

export const MarkdownEditorWithToolbar: React.FC<MarkdownEditorWithToolbarProps> = ({
  showToolbar = true,
  className,
  ...props
}) => {
  const handleInsert = useCallback((text: string) => {
    const newValue = props.value + text
    props.onChange(newValue)
  }, [props])

  return (
    <div className={cn('rounded-card overflow-hidden border border-border', className)}>
      {showToolbar && <MarkdownEditorToolbar onInsert={handleInsert} />}
      <MarkdownEditor {...props} className="rounded-none border-0" />
    </div>
  )
}