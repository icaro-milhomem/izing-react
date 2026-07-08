import { Box, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import type { Message } from '@/types/entities'
import { useBrandTokens } from '@/hooks/useBrandTokens'

interface ReplyPreviewProps {
  message: Message
  onClear: () => void
}

export function ReplyPreview({ message, onClear }: ReplyPreviewProps) {
  const { colors } = useBrandTokens()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1,
        bgcolor: theme => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
        borderTop: 1,
        borderColor: 'divider'
      }}
    >
      <Box sx={{ flex: 1, borderLeft: 3, borderColor: colors.accent, pl: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: colors.primary }}>
          {message.fromMe ? 'Você' : message.contact?.name || 'Contato'}
        </Typography>
        <Typography variant="body2" noWrap>
          {message.body?.slice(0, 120) || '(mídia)'}
        </Typography>
      </Box>
      <IconButton size="small" onClick={onClear}><CloseIcon fontSize="small" /></IconButton>
    </Box>
  )
}
