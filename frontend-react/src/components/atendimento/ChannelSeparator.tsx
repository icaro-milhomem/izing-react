import { Box, Divider, Typography } from '@mui/material'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'
import { getChannelLabel } from '@/utils/channelHelpers'

interface ChannelSeparatorProps {
  channel?: string | null
  whatsappName?: string | null
  whatsappLogo?: string | null
  ticketId?: number
}

export function ChannelSeparator({
  channel,
  whatsappName,
  whatsappLogo,
  ticketId
}: ChannelSeparatorProps) {
  const label = getChannelLabel(channel, whatsappName)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', my: 2, gap: 1.5 }}>
      <Divider sx={{ flex: 1 }} />
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          bgcolor: 'grey.200',
          maxWidth: '80%'
        }}
      >
        <ChannelLogo channel={channel} logo={whatsappLogo} size={18} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {label}
          {ticketId ? ` · #${ticketId}` : ''}
        </Typography>
      </Box>
      <Divider sx={{ flex: 1 }} />
    </Box>
  )
}
