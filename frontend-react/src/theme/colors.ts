export const brand = {
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  accent: '#06B6D4',
  accentAlt: '#22D3EE',
  gradient: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 45%, #06B6D4 100%)',
  gradientSoft: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)'
}

export type SidebarColors = {
  background: string
  border: string
  text: string
  textMuted: string
  textActive: string
  itemHover: string
  itemActive: string
  iconBg: string
  captionSelected: string
}

export const sidebarDark: SidebarColors = {
  background: 'linear-gradient(180deg, #070B14 0%, #0F1629 48%, #0B1020 100%)',
  border: 'rgba(255, 255, 255, 0.06)',
  text: 'rgba(226, 232, 240, 0.78)',
  textMuted: 'rgba(148, 163, 184, 0.72)',
  textActive: '#FFFFFF',
  itemHover: 'rgba(255, 255, 255, 0.06)',
  itemActive: 'linear-gradient(90deg, rgba(124, 58, 237, 0.32) 0%, rgba(6, 182, 212, 0.12) 100%)',
  iconBg: 'rgba(255, 255, 255, 0.07)',
  captionSelected: 'rgba(226, 232, 240, 0.65)'
}

export const sidebarLight: SidebarColors = {
  background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFF 48%, #F4F2FF 100%)',
  border: 'rgba(124, 58, 237, 0.1)',
  text: 'rgba(51, 65, 85, 0.88)',
  textMuted: 'rgba(100, 116, 139, 0.78)',
  textActive: '#1E1B4B',
  itemHover: 'rgba(124, 58, 237, 0.07)',
  itemActive: 'linear-gradient(90deg, rgba(124, 58, 237, 0.14) 0%, rgba(6, 182, 212, 0.08) 100%)',
  iconBg: 'rgba(124, 58, 237, 0.08)',
  captionSelected: 'rgba(79, 70, 229, 0.65)'
}

/** @deprecated use getSidebarColors(mode) */
export const sidebar = sidebarDark

/** @deprecated use getSidebarColors from @/theme/brandTokens with ThemeColors */
export function getSidebarColorsLegacy(mode: 'light' | 'dark'): SidebarColors {
  return mode === 'dark' ? sidebarDark : sidebarLight
}

export const surface = {
  lightBg: '#F4F2FF',
  lightPaper: '#FFFFFF',
  darkBg: '#0A0D14',
  darkPaper: '#121826'
}
