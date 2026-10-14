import { useEffect, useState } from 'react'
import { getInitialTheme } from '../theme'

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { window.localStorage.setItem('fate-theme', theme) } catch { /* Storage can be unavailable. */ }
  }, [theme])

  return { theme, setTheme }
}
