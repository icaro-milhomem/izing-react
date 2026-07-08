import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

const HELP_ITEMS = [
  { title: 'Adicionar etapa', body: 'Use o botão "Etapa" na barra superior para criar um novo nó no canvas.' },
  { title: 'Conectar nós', body: 'Arraste de um ponto de conexão (handle) de um nó até outro para criar uma rota.' },
  { title: 'Editar propriedades', body: 'Clique em um nó para editar mensagens, mídias e condições no painel à direita.' },
  { title: 'Condições', body: 'Na aba Condições, defina palavras-chave e ações (fila, usuário ou próxima etapa).' },
  { title: 'Variáveis', body: 'Use {{name}}, {{greeting}} e {{protocol}} nas mensagens para personalizar.' },
  { title: 'Salvar', body: 'Clique em Salvar para persistir o fluxo no servidor.' }
]

interface FlowHelpDialogProps {
  open: boolean
  onClose: () => void
}

export function FlowHelpDialog({ open, onClose }: FlowHelpDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Ajuda — Builder de Fluxo
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Guia rápido para montar fluxos de chatbot no canvas.
        </Typography>
        <List dense>
          {HELP_ITEMS.map(item => (
            <ListItem key={item.title} alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemText primary={item.title} secondary={item.body} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  )
}
