'use client'

import { useCallback, useEffect, useState } from 'react'

interface KeyboardShortcutsReturn {
  showHelp: boolean
  setShowHelp: (show: boolean) => void
}

const SHORTCUTS = [
  { key: '/', description: '搜索' },
  { key: '?', description: '快捷键帮助' },
  { key: 't', description: '切换主题' },
]

export function useKeyboardShortcuts(): KeyboardShortcutsReturn {
  const [showHelp, setShowHelp] = useState(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in input/textarea/contenteditable
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea') return
    if ((e.target as HTMLElement)?.contentEditable === 'true') return

    switch (e.key) {
      case '/': {
        e.preventDefault()
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[name="q"], input[type="search"]'
        )
        if (searchInput) {
          searchInput.focus()
        }
        break
      }
      case '?': {
        e.preventDefault()
        setShowHelp(prev => !prev)
        break
      }
      case 't': {
        e.preventDefault()
        // Dispatch a custom event that the Header / ThemeProvider can listen to
        // We use the useTheme hook's toggleTheme via a DOM event
        window.dispatchEvent(new CustomEvent('keyboard-toggle-theme'))
        break
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { showHelp, setShowHelp }
}

export { SHORTCUTS }
