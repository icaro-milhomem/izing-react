import { Box, Typography } from '@mui/material'
import { Sparkles } from 'lucide-react'
import { useBrandTokens } from '@/hooks/useBrandTokens'

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  variant?: 'default' | 'onDark'
}

const sizes = {
  sm: { icon: 30, text: '1.05rem' },
  md: { icon: 38, text: '1.3rem' },
  lg: { icon: 54, text: '1.85rem' }
}

export function BrandLogo({ size = 'md', showText = true, variant = 'default' }: BrandLogoProps) {
  const { brand } = useBrandTokens()
  const dim = sizes[size]
  const onDark = variant === 'onDark'

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        sx={{
          width: dim.icon,
          height: dim.icon,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          background: brand.gradient,
          boxShadow: onDark
            ? `0 10px 28px ${brand.iconShadow}`
            : `0 10px 24px ${brand.iconShadowSoft}`,
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 55%)'
          }
        }}
      >
        <Sparkles size={dim.icon * 0.48} color="#fff" strokeWidth={2.25} />
      </Box>
      {showText && (
        <Typography
          component="span"
          sx={{
            fontSize: dim.text,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color: onDark ? '#fff' : 'text.primary',
            background: onDark ? 'none' : brand.gradient,
            WebkitBackgroundClip: onDark ? undefined : 'text',
            WebkitTextFillColor: onDark ? '#fff' : 'transparent'
          }}
        >
          IZING
        </Typography>
      )}
    </Box>
  )
}
