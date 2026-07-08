import { Box, Button, Tooltip, Typography, type ButtonProps } from '@mui/material'
import { alpha, type Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { useAppTheme } from '@/providers/AppThemeProvider'

interface LabeledIconButtonProps extends Omit<ButtonProps, 'children'> {
  label: string
  icon: ReactNode
  active?: boolean
  tooltip?: string
}

export function LabeledIconButton({
  label,
  icon,
  active,
  tooltip,
  disabled,
  sx,
  ...props
}: LabeledIconButtonProps) {
  const { colors } = useAppTheme()
  const hint = tooltip || label

  const button = (
    <Button
      variant="text"
      disabled={disabled}
      {...props}
      sx={[
        (theme: Theme) => ({
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 58,
          maxWidth: 72,
          px: 0.5,
          py: 0.75,
          gap: 0.35,
          borderRadius: 2.5,
          color: active ? colors.primary : theme.palette.text.primary,
          opacity: disabled ? 0.45 : 1,
          textTransform: 'none',
          border: `1px solid ${alpha(colors.primary, active ? 0.3 : 0.08)}`,
          bgcolor: active
            ? alpha(colors.primary, theme.palette.mode === 'light' ? 0.1 : 0.18)
            : alpha(colors.primary, theme.palette.mode === 'light' ? 0.04 : 0.08),
          '&:hover': {
            bgcolor: alpha(colors.primary, theme.palette.mode === 'light' ? 0.12 : 0.22),
            borderColor: alpha(colors.primary, 0.28),
            color: colors.primary
          }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 2,
          bgcolor: active ? alpha(colors.primary, 0.12) : 'transparent',
          '& svg': { strokeWidth: 2.5 }
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.68rem',
          fontWeight: 600,
          lineHeight: 1.1,
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </Typography>
    </Button>
  )

  return (
    <Tooltip title={hint} placement="bottom" arrow enterDelay={500}>
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  )
}
