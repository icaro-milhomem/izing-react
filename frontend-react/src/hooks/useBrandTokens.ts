import { useMemo } from 'react'
import { useAppTheme } from '@/providers/AppThemeProvider'
import { buildBrandTokens, getSidebarColors } from '@/theme/brandTokens'

export function useBrandTokens() {
  const { colors, mode } = useAppTheme()

  return useMemo(
    () => ({
      colors,
      mode,
      brand: buildBrandTokens(colors),
      sidebar: getSidebarColors(mode, colors)
    }),
    [colors, mode]
  )
}
