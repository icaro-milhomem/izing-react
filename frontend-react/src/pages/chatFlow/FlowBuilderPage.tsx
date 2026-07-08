import { Box, Button, IconButton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link, useSearchParams } from 'react-router-dom'
import { FlowBuilderCanvas } from '@/components/chatFlow/FlowBuilderCanvas'

export function FlowBuilderPage() {
  const [params] = useSearchParams()
  const flowId = Number(params.get('flowId'))

  if (!flowId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Selecione um fluxo em Chatbot → Abrir builder</Typography>
        <Button component={Link} to="/chat-flow" sx={{ mt: 2 }}>Voltar</Button>
      </Box>
    )
  }

  return (
    <FlowBuilderCanvas
      flowId={flowId}
      toolbarExtra={
        <IconButton component={Link} to="/chat-flow"><ArrowBackIcon /></IconButton>
      }
    />
  )
}
