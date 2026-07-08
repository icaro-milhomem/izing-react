import { Box, Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export function Error404Page() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 3,
        textAlign: 'center'
      }}
    >
      <Typography variant="h1" sx={{ fontWeight: 800, fontSize: '6rem', lineHeight: 1, color: 'primary.main' }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Página não encontrada
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        O endereço que você acessou não existe ou foi movido.
      </Typography>
      <Button variant="contained" component={Link} to="/home">
        Voltar ao início
      </Button>
    </Box>
  )
}
