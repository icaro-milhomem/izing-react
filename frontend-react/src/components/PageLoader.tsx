import { Box, CircularProgress } from '@mui/material'

export function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
      <CircularProgress />
    </Box>
  )
}
