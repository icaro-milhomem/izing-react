import { Box, Chip, Typography } from '@mui/material'

export function SystemVersion() {
  return (
    <Box sx={{ textAlign: 'center', py: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Versão Sistema
      </Typography>
      <Chip label={`v${__APP_VERSION__}`} size="small" color="primary" />
    </Box>
  )
}
