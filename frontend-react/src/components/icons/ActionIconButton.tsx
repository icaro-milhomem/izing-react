import { IconButton, Tooltip, type IconButtonProps } from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import type { SxProps } from '@mui/material/styles'
import { useAppTheme } from '@/providers/AppThemeProvider'

interface ActionIconButtonProps extends IconButtonProps {
  title?: string
  active?: boolean
}

export function ActionIconButton({ title, active, children, sx, ...props }: ActionIconButtonProps) {
  const { colors } = useAppTheme()

  const mergedSx: SxProps<Theme> = [
    (theme: Theme) => ({
      width: 42,
      height: 42,
      borderRadius: 3,
      transition: 'all 0.2s ease',
      bgcolor: active
        ? alpha(colors.primary, theme.palette.mode === 'light' ? 0.16 : 0.26)
        : alpha(colors.primary, theme.palette.mode === 'light' ? 0.08 : 0.14),
      color: active ? colors.primary : theme.palette.text.primary,
      border: `1.5px solid ${alpha(colors.primary, active ? 0.35 : 0.14)}`,
      '&:hover': {
        bgcolor: alpha(colors.primary, theme.palette.mode === 'light' ? 0.18 : 0.3),
        color: colors.primary,
        borderColor: alpha(colors.primary, 0.4),
        transform: 'translateY(-1px)',
        boxShadow: `0 6px 16px ${alpha(colors.primary, 0.2)}`
      },
      '&.Mui-disabled': {
        opacity: 0.4,
        color: theme.palette.text.disabled
      },
      '& svg': {
        strokeWidth: 2.5
      }
    }),
    ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
  ]

  const button = (
    <IconButton size="medium" {...props} sx={mergedSx}>
      {children}
    </IconButton>
  )

  if (!title) return button

  return (
    <Tooltip title={title} placement="bottom" arrow enterDelay={400}>
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  )
}
