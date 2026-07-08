export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
}

export const DEFAULT_THEME: ThemeColors = {
  primary: '#7C3AED',
  secondary: '#F4F2FF',
  accent: '#06B6D4'
}

export const THEME_PRESETS: Array<ThemeColors & { name: string }> = [
  { name: 'Violeta', primary: '#7C3AED', secondary: '#F4F2FF', accent: '#06B6D4' },
  { name: 'Azul', primary: '#2563EB', secondary: '#EFF6FF', accent: '#0EA5E9' },
  { name: 'Rosa', primary: '#DB2777', secondary: '#FDF2F8', accent: '#F472B6' },
  { name: 'Verde', primary: '#059669', secondary: '#ECFDF5', accent: '#10B981' },
  { name: 'Laranja', primary: '#EA580C', secondary: '#FFF7ED', accent: '#FB923C' }
]

export function loadThemeFromStorage(): ThemeColors {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as {
      configs?: { theme?: ThemeColors }
    } | null
    if (usuario?.configs?.theme?.primary) {
      return { ...DEFAULT_THEME, ...usuario.configs.theme }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME
}

export function persistThemeToStorage(colors: ThemeColors) {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as Record<string, unknown> | null
    if (!usuario) return
    const configs = { ...(usuario.configs as Record<string, unknown> | undefined), theme: colors }
    localStorage.setItem('usuario', JSON.stringify({ ...usuario, configs }))
  } catch {
    /* ignore */
  }
}
