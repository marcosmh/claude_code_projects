import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

// La clave y los colores se repiten en el script inline de index.html (evita el parpadeo al cargar).
const STORAGE_KEY = 'chatroom:theme:v1'
const THEME_COLOR: Record<Theme, string> = { dark: '#1e1e2f', light: '#f5f6fa' }

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme])
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // almacenamiento no disponible: el tema solo dura la sesión
    }
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  )

  return { theme, toggleTheme }
}
