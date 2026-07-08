import type { ReactNode } from 'react'
import { Alert, Box, Typography } from '@mui/material'

interface AdminOnlyProps {
  profile: string | null
  children: ReactNode
}

export function AdminOnly({ profile, children }: AdminOnlyProps) {
  if (profile !== 'admin') {
    return (
      <Alert severity="warning">
        Acesso restrito a administradores.
      </Alert>
    )
  }
  return <>{children}</>
}

interface SuperOnlyProps {
  profile: string | null
  children: ReactNode
}

export function SuperOnly({ profile, children }: SuperOnlyProps) {
  const normalized = (profile || '').trim().toLowerCase()
  if (normalized !== 'super') {
    return (
      <Alert severity="warning">
        Acesso restrito a super administradores.
      </Alert>
    )
  }
  return <>{children}</>
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  )
}
