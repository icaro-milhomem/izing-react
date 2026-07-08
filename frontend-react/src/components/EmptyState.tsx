import { Box, Typography, type SxProps, type Theme } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  sx?: SxProps<Theme>
}

export function EmptyState({ icon, title, description, sx }: EmptyStateProps) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center',
        ...sx
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            color: 'primary.main'
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 280, opacity: 0.85 }}>
          {description}
        </Typography>
      )}
    </Box>
  )
}
