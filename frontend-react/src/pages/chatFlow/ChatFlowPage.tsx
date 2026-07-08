import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  CircularProgress
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Link } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { createChatFlow, deleteChatFlow, duplicateChatFlow, listChatFlows, updateChatFlow } from '@/api/chatFlow'
import type { ChatFlow } from '@/types/entities'

function FlowDialog({
  open,
  initial,
  onClose,
  onSaved
}: {
  open: boolean
  initial: Partial<ChatFlow>
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<ChatFlow>>({ name: '', isActive: true, ...initial })
  const { enqueueSnackbar } = useSnackbar()

  const save = async () => {
    try {
      if (form.id) await updateChatFlow(form.id, form)
      else await createChatFlow(form)
      enqueueSnackbar('Fluxo salvo', { variant: 'success' })
      onSaved()
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? 'Editar' : 'Novo'} Fluxo</DialogTitle>
      <DialogContent>
        <TextField fullWidth label="Nome" margin="normal" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <FormControlLabel control={<Checkbox checked={Boolean(form.isActive)} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />} label="Ativo" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save}>Salvar</Button>
      </DialogActions>
    </Dialog>
  )
}

export function ChatFlowPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<ChatFlow>>({})
  const [confirm, setConfirm] = useState<ChatFlow | null>(null)
  const [duplicateSource, setDuplicateSource] = useState<ChatFlow | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const { enqueueSnackbar } = useSnackbar()

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['chatFlows'],
    queryFn: async () => (await listChatFlows()).data
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => deleteChatFlow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFlows'] })
      setConfirm(null)
    }
  })

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => duplicateChatFlow(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatFlows'] })
      enqueueSnackbar('Fluxo duplicado', { variant: 'success' })
      setDuplicateSource(null)
      setDuplicateName('')
    },
    onError: (err: unknown) => {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao duplicar', { variant: 'error' })
    }
  })

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Chatbot — Fluxos" action={<Button variant="contained" onClick={() => { setEditing({}); setDialogOpen(true) }}>Adicionar</Button>} />
      {isLoading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Ativo</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flows.map(f => (
                <TableRow key={f.id}>
                  <TableCell>{f.id}</TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.isActive ? 'Sim' : 'Não'}</TableCell>
                  <TableCell align="center">
                    <IconButton component={Link} to={`/chat-flow/builder?flowId=${f.id}`} title="Abrir builder">
                      <AccountTreeIcon />
                    </IconButton>
                    <IconButton title="Duplicar" onClick={() => { setDuplicateSource(f); setDuplicateName(`${f.name} (cópia)`) }}>
                      <ContentCopyIcon />
                    </IconButton>
                    <IconButton onClick={() => { setEditing(f); setDialogOpen(true) }}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => setConfirm(f)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <FlowDialog open={dialogOpen} initial={editing} onClose={() => setDialogOpen(false)} onSaved={() => queryClient.invalidateQueries({ queryKey: ['chatFlows'] })} />
      <ConfirmDialog open={Boolean(confirm)} title="Excluir fluxo?" message={`Excluir "${confirm?.name}"?`} onCancel={() => setConfirm(null)} onConfirm={() => confirm && removeMutation.mutate(confirm.id)} />
      <Dialog open={Boolean(duplicateSource)} onClose={() => setDuplicateSource(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Duplicar fluxo</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nome do novo fluxo"
            margin="normal"
            value={duplicateName}
            onChange={e => setDuplicateName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateSource(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!duplicateName.trim() || duplicateMutation.isPending}
            onClick={() => duplicateSource && duplicateMutation.mutate({ id: duplicateSource.id, name: duplicateName.trim() })}
          >
            Duplicar
          </Button>
        </DialogActions>
      </Dialog>
    </AdminOnly>
  )
}
