import { Box, Button, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { ChannelLogo } from '@/components/atendimento/ChannelLogo'
import type { ChannelOption } from '@/utils/channelOptions'

interface ChannelSelectorProps {
  channels: ChannelOption[]
  selectedId?: number | 'all' | null
  onSelect: (channelId: number | 'all') => void
}

export function ChannelSelector({ channels, selectedId, onSelect }: ChannelSelectorProps) {
  const theme = useTheme()

  if (channels.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
        Nenhum canal disponível
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.75,
        px: 1.5,
        py: 1,
        overflowX: 'auto',
        borderBottom: 1,
        borderColor: 'divider',
        '&::-webkit-scrollbar': { height: 6 }
      }}
    >
      {channels.map(channel => {
        const selected = selectedId === channel.id
        return (
          <Button
            key={String(channel.id)}
            variant="text"
            onClick={() => onSelect(channel.id)}
            sx={{
              flexShrink: 0,
              minWidth: 0,
              px: 1.5,
              py: 0.5,
              textTransform: 'none',
              borderRadius: 3,
              border: '1.5px solid',
              borderColor: selected ? 'primary.main' : alpha(theme.palette.divider, 0.9),
              bgcolor: selected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: selected ? 'primary.main' : 'text.secondary',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: selected
                  ? alpha(theme.palette.primary.main, 0.14)
                  : alpha(theme.palette.primary.main, 0.05),
                borderColor: selected ? 'primary.main' : alpha(theme.palette.primary.main, 0.25)
              }
            }}
          >
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              {channel.id !== 'all' && (
                <ChannelLogo channel={channel.channel} logo={channel.logo} size={20} />
              )}
              <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {channel.name}
              </Typography>
            </Box>
          </Button>
        )
      })}
    </Box>
  )
}
