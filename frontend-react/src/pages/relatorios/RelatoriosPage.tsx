import { Link } from 'react-router-dom'
import { Box, Paper, Typography } from '@mui/material'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { reports } from '@/config/reports'

export function RelatoriosPage() {
  const profile = localStorage.getItem('profile')

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Relatórios" subtitle="Selecione um relatório" />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {reports.map(r => (
          <Paper
            key={r.path}
            component={Link}
            to={r.path}
            sx={{
              p: 2,
              width: 340,
              textDecoration: 'none',
              color: 'inherit',
              borderLeft: 4,
              borderColor: 'primary.main',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>{r.title}</Typography>
            <Typography variant="body2" color="text.secondary">{r.description}</Typography>
          </Paper>
        ))}
      </Box>
    </AdminOnly>
  )
}
