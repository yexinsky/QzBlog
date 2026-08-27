'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  storageKey = 'qzhou-blog-theme',
}) => {
  // Initial state must be deterministic on both server and client to avoid hydration
  // mismatch. The actual saved preference is restored after mount via useEffect below,
  // and the <html> class is preset synchronously by the inline bootstrap script in
  // src/app/layout.tsx so CSS variables resolve to the right values before paint.
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [hydrated, setHydrated] = useState(false)

  // Read persisted preference once on the client, then mark hydrated so the
  // persistence effect below is allowed to run. We keep this isolated from the
  // write effect to guarantee we never overwrite a stored value with the default.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored)
      }
    } catch {
      /* localStorage may be unavailable (private mode, SSR-like envs) — ignore */
    }
    setHydrated(true)
  }, [storageKey])

  // Persist + apply class to <html> whenever the theme changes, but only after the
  // initial hydration has finished. Skipping before hydration avoids stomping the
  // saved value with `defaultTheme` on the very first render.
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(storageKey, theme)
    } catch {
      /* ignore quota / privacy errors */
    }
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme
  }, [theme, hydrated, storageKey])

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const handleSetTheme = (next: Theme) => {
    setThemeState(next)
  }

  // Always render children directly. Do NOT wrap or hide — that would either cause
  // a hydration mismatch (extra DOM node on server vs client) or visually hide the
  // whole page during SSR. The inline bootstrap script in layout.tsx is responsible
  // for setting the correct <html> class before paint, eliminating FOUC.
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export { ThemeContext }
export type { ThemeContextValue }
