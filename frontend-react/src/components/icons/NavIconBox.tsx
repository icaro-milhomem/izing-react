import { Box } from '@mui/material'
import { MenuLucideIcon } from '@/components/icons/menuIcons'
import type { BrandTokens } from '@/theme/brandTokens'
import type { SidebarColors } from '@/theme/colors'
import { useBrandTokens } from '@/hooks/useBrandTokens'

interface NavIconBoxProps {
  name: string
  selected?: boolean
  tone?: 'default' | 'error'
  sidebar?: SidebarColors
  brand?: BrandTokens
}

export function NavIconBox({
  name,
  selected,
  tone = 'default',
  sidebar: sidebarProp,
  brand: brandProp
}: NavIconBoxProps) {
  const tokens = useBrandTokens()
  const sidebar = sidebarProp ?? tokens.sidebar
  const brand = brandProp ?? tokens.brand
  const isError = tone === 'error' && !selected

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: 2.5,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        transition: 'all 0.25s ease',
        background: selected
          ? brand.gradient
          : isError
            ? 'rgba(239, 68, 68, 0.16)'
            : sidebar.iconBg,
        color: selected ? '#fff' : isError ? '#FCA5A5' : sidebar.text,
        boxShadow: selected ? `0 8px 22px ${brand.iconShadow}` : 'none',
        '& svg': {
          filter: selected ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none'
        }
      }}
    >
      <MenuLucideIcon name={name} size={20} strokeWidth={selected ? 2.5 : 2.25} />
    </Box>
  )
}
