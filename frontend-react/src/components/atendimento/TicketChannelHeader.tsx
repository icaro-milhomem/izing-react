import { Box, Typography } from '@mui/material'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'

interface TicketChannelHeaderProps {
  name: string
  channel?: string | null
  logo?: string | null
  count: number
}

export function TicketChannelHeader({ name, channel, logo, count }: TicketChannelHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
        borderBottom: 1,
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1
      }}
    >
      <ChannelLogo channel={channel} logo={logo} size={24} />
      <Typography variant="caption" sx={{ fontWeight: 700, flex: 1 }}>
        {name}
      </Typography>
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
    </Box>
  )
}
