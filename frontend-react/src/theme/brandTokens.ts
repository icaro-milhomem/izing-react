import { alpha } from '@mui/material/styles'
import type { ThemeColors } from '@/utils/themeApply'
import type { SidebarColors } from '@/theme/colors'
import { sidebarDark, sidebarLight } from '@/theme/colors'

export function buildBrandTokens(colors: ThemeColors) {
  return {
    primary: colors.primary,
    accent: colors.accent,
    secondary: colors.secondary,
    primaryLight: colors.primary,
    gradient: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
    gradientSoft: `linear-gradient(135deg, ${alpha(colors.primary, 0.15)} 0%, ${alpha(colors.accent, 0.08)} 100%)`,
    iconShadow: alpha(colors.primary, 0.42),
    iconShadowSoft: alpha(colors.primary, 0.18)
  }
}

export type BrandTokens = ReturnType<typeof buildBrandTokens>

export function getSidebarColors(mode: 'light' | 'dark', colors: ThemeColors): SidebarColors {
  const base = mode === 'dark' ? sidebarDark : sidebarLight

  return {
    ...base,
    border: mode === 'dark' ? base.border : alpha(colors.primary, 0.1),
    itemHover: mode === 'dark' ? base.itemHover : alpha(colors.primary, 0.07),
    itemActive: `linear-gradient(90deg, ${alpha(colors.primary, mode === 'dark' ? 0.32 : 0.14)} 0%, ${alpha(colors.accent, mode === 'dark' ? 0.12 : 0.08)} 100%)`,
    iconBg: mode === 'dark' ? base.iconBg : alpha(colors.primary, 0.08),
    captionSelected: mode === 'dark' ? base.captionSelected : alpha(colors.primary, 0.65)
  }
}
