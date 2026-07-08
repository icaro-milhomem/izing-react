import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { useAuthStore } from '@/store/authStore'
import { createAppTheme } from '@/theme/createAppTheme'
import {
  DEFAULT_THEME,
  loadThemeFromStorage,
  persistThemeToStorage,
  type ThemeColors
} from '@/utils/themeApply'
import { loadDarkModeFromStorage, persistDarkModePreference, saveUserConfigs } from '@/utils/userConfigs'

type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  colors: ThemeColors
  mode: ThemeMode
  setColors: (colors: ThemeColors) => void
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: DEFAULT_THEME,
  mode: 'light',
  setColors: () => {},
  toggleDarkMode: () => {}
})

export function useAppTheme() {
  return useContext(ThemeContext)
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(() => loadThemeFromStorage())
  const [mode, setMode] = useState<ThemeMode>(() => (loadDarkModeFromStorage() ? 'dark' : 'light'))
  const updateUsuario = useAuthStore(s => s.updateUsuario)
  const userId = useAuthStore(s => s.user?.userId)

  useEffect(() => {
    setMode(loadDarkModeFromStorage() ? 'dark' : 'light')
  }, [userId])

  const toggleDarkMode = useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    const isDark = next === 'dark'
    persistDarkModePreference(isDark)
    setMode(next)
    void saveUserConfigs({ isDark })
    updateUsuario({ configs: { isDark } })
  }, [mode, updateUsuario])

  const theme = useMemo(() => createAppTheme(mode, colors), [colors, mode])

  const setColorsAndPersist = useCallback((next: ThemeColors) => {
    setColors(next)
    persistThemeToStorage(next)
  }, [])

  const value = useMemo(
    () => ({
      colors,
      mode,
      setColors: setColorsAndPersist,
      toggleDarkMode
    }),
    [colors, mode, setColorsAndPersist, toggleDarkMode]
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}
