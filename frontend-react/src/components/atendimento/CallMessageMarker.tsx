import { Box, Typography } from '@mui/material'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'

interface CallMessageMarkerProps {
  body?: string
}

export function CallMessageMarker({ body }: CallMessageMarkerProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        mb: 0.5,
        p: 1,
        borderRadius: 1,
        bgcolor: 'action.hover'
      }}
    >
      <PhoneInTalkIcon sx={{ fontSize: 20, mt: 0.25, opacity: 0.9 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.25 }}>
          Chamada de voz/vídeo
        </Typography>
        {body && (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {body}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
