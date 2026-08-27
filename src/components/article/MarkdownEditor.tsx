'use client'

import React, { useCallback, useMemo, useRef } from 'react'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { ChangeSpec } from '@codemirror/state'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import {
  EditorSnapshot,
  EditorUpdate,
  wrapSelection,
  linkWrap,
  imageWrap,
  insertLinePrefix,
  insertBlock,
} from '@/components/comments/markdownInsert'

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

  const extensions = useMemo(() => [markdown({ codeLanguages: languages })], [])

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
        style={{ fontSize: '14px' }}
      />
    </div>
  )
}

/**
 * High-level toolbar actions. Each maps to a pure helper in markdownInsert.ts.
 */
export type MarkdownToolbarAction =
  | 'heading1' | 'heading2' | 'heading3'
  | 'bold' | 'italic' | 'strikethrough'
  | 'link' | 'image'
  | 'inlineCode' | 'codeBlock'
  | 'quote' | 'unorderedList' | 'orderedList' | 'taskList'
  | 'table'

/**
 * Compute the EditorUpdate for a toolbar action against a snapshot of the
 * current document + selection. Pure function so it can be unit-tested
 * without CodeMirror.
 */
export function computeMarkdownUpdate(
  action: MarkdownToolbarAction,
  snap: EditorSnapshot
): EditorUpdate {
  switch (action) {
    case 'heading1': return insertLinePrefix(snap, '# ')
    case 'heading2': return insertLinePrefix(snap, '## ')
    case 'heading3': return insertLinePrefix(snap, '### ')
    case 'bold':     return wrapSelection(snap, '**', '**', '粗体文字')
    case 'italic':   return wrapSelection(snap, '*', '*', '斜体文字')
    case 'strikethrough':
      return wrapSelection(snap, '~~', '~~', '删除线')
    case 'link':     return linkWrap(snap, '链接文字', 'https://')
    case 'image':    return imageWrap(snap, '图片描述', 'https://')
    case 'inlineCode':
      return wrapSelection(snap, '`', '`', '代码')
    case 'codeBlock':
      return insertBlock(snap, '```\n', '\n```', '代码块')

    case 'quote':    return insertLinePrefix(snap, '> ')
    case 'unorderedList':
      return insertLinePrefix(snap, '- ')
    case 'orderedList':
      return insertLinePrefix(snap, '1. ')
    case 'taskList':
      return insertLinePrefix(snap, '- [ ] ')
    case 'table':
      return insertBlock(
        snap,
        '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n',
        '',
        '| 内容 | 内容 | 内容 |'
      )
    default: {
      const exhaustive: never = action
      throw new Error('Unknown toolbar action: ' + (exhaustive as unknown as string))
    }
  }
}

/**
 * Apply an EditorUpdate to a CodeMirror view, preserving any other selections.
 */
export function applyMarkdownUpdate(view: EditorView, update: EditorUpdate): void {
  const main = view.state.selection.main
  const selLength = main.to - main.from

  const specs: ChangeSpec[] = update.changes.map(ch => ({
    from: ch.from,
    to: ch.to,
    insert: ch.insert,
  }))

  view.dispatch({
    changes: specs,
    selection: selLength > 0
      ? { anchor: update.cursor, head: update.cursor }
      : { anchor: update.cursor },
    scrollIntoView: true,
  })
  view.focus()
}

interface MarkdownEditorToolbarProps {
  /**
   * Receive a toolbar action. MarkdownEditorWithToolbar wires this up to a
   * CodeMirror transaction; consumers can also wire it to a custom callback.
   */
  onAction: (action: MarkdownToolbarAction) => void
  className?: string
  disabled?: boolean
}

interface ToolbarItem {
  label: string
  title: string
  action: MarkdownToolbarAction
  bold?: boolean
  italic?: boolean
  strikethrough?: boolean
}

type ToolbarEntry = ToolbarItem | { type: 'divider' }

const TOOLBAR_ITEMS: ToolbarEntry[] = [
  { label: 'H1', title: '标题1', action: 'heading1' },
  { label: 'H2', title: '标题2', action: 'heading2' },
  { label: 'H3', title: '标题3', action: 'heading3' },
  { type: 'divider' },
  { label: 'B', title: '粗体', action: 'bold', bold: true },
  { label: 'I', title: '斜体', action: 'italic', italic: true },
  { label: 'S', title: '删除线', action: 'strikethrough', strikethrough: true },
  { type: 'divider' },
  { label: '链接', title: '链接', action: 'link' },
  { label: '图片', title: '图片', action: 'image' },
  { label: '代码', title: '行内代码', action: 'inlineCode' },
  { label: '代码块', title: '代码块', action: 'codeBlock' },
  { type: 'divider' },
  { label: '引用', title: '引用', action: 'quote' },
  { label: '列表', title: '无序列表', action: 'unorderedList' },
  { label: '有序列表', title: '有序列表', action: 'orderedList' },
  { label: '任务', title: '任务列表', action: 'taskList' },
  { type: 'divider' },
  { label: '表格', title: '表格', action: 'table' },
]

export const MarkdownEditorToolbar: React.FC<MarkdownEditorToolbarProps> = ({ onAction, className, disabled }) => {
  return (
    <div className={cn('flex items-center flex-wrap gap-1 p-2 border-b border-border bg-background-cream', className)}>
      {TOOLBAR_ITEMS.map((item, index) => {
        if ('type' in item && item.type === 'divider') {
          return <div key={String('d-'+index)} className="w-px h-6 bg-border mx-1" aria-hidden="true" />
        }
        const t = item as ToolbarItem
        return (
          <button
            key={t.action}
            type="button"
            onClick={() => onAction(t.action)}
            disabled={disabled}
            className="px-2 py-1 text-sm font-medium text-text-secondary hover:bg-background-hover rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontWeight: t.bold ? 'bold' : undefined,
              fontStyle: t.italic ? 'italic' : undefined,
              textDecoration: t.strikethrough ? 'line-through' : undefined,
            }}
            title={t.title}
            aria-label={t.title}
            data-md-action={t.action}
          >
            {t.label}
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
  const cmRef = useRef<ReactCodeMirrorRef | null>(null)

  const handleAction = useCallback((action: MarkdownToolbarAction) => {
    const view = cmRef.current?.view
    if (!view) return
    const main = view.state.selection.main
    const snap: EditorSnapshot = {
      text: view.state.doc.toString(),
      selectionFrom: main.from,
      selectionTo: main.to,
    }
    const update = computeMarkdownUpdate(action, snap)
    applyMarkdownUpdate(view, update)
  }, [])

  return (
    <div className={cn('rounded-card overflow-hidden border border-border', className)}>
      {showToolbar && <MarkdownEditorToolbar onAction={handleAction} disabled={props.disabled} />}
      <CodeMirror
        ref={cmRef}
        value={props.value}
        height={props.minHeight ?? '400px'}
        extensions={[markdown({ codeLanguages: languages })]}
        onChange={props.onChange}
        placeholder={props.placeholder}
        editable={!props.disabled}
      />
    </div>
  )
}
