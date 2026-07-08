import { Box } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import { ICON_SIZE_SM, ICON_STROKE } from '@/components/icons/iconStyles'

interface TicketTabLabelProps {
  label: string
  count: number
  icon?: LucideIcon
}

export function TicketTabLabel({ label, count, icon: Icon }: TicketTabLabelProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6 }}>
      {Icon && <Icon size={ICON_SIZE_SM} strokeWidth={ICON_STROKE} />}
      {label}
      {count > 0 && (
        <Box
          component="span"
          sx={{
            bgcolor: 'error.main',
            color: 'error.contrastText',
            borderRadius: 10,
            px: 0.75,
            py: 0.125,
            fontSize: '0.7rem',
            fontWeight: 700,
            minWidth: 18,
            textAlign: 'center',
            lineHeight: 1.4
          }}
        >
          {count > 999 ? '999+' : count}
        </Box>
      )}
    </Box>
  )
}
