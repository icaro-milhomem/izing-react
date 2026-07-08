import { Paper, Typography } from '@mui/material'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        {title}
      </Typography>
      <Typography color="text.secondary">
        {description || 'Esta página será migrada do frontend Vue em breve.'}
      </Typography>
    </Paper>
  )
}
