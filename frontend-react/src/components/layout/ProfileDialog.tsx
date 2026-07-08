import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField
} from '@mui/material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useSnackbar } from 'notistack'
import { updateUser } from '@/api/users'
import { useAuthStore } from '@/store/authStore'

interface ProfileDialogProps {
  open: boolean
  onClose: () => void
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const user = useAuthStore(s => s.user)
  const updateUsuario = useAuthStore(s => s.updateUsuario)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !user) return
    setName(user.username || '')
    setEmail(user.email || '')
    setPassword('')
    setShowPassword(false)
  }, [open, user])

  const handleSave = async () => {
    if (!user?.userId) return
    if (!name.trim() || !email.trim()) {
      enqueueSnackbar('Preencha nome e e-mail', { variant: 'warning' })
      return
    }
    setLoading(true)
    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        email: email.trim()
      }
      if (password.trim()) payload.password = password.trim()

      const { data } = await updateUser(user.userId, payload)
      updateUsuario({
        username: data.name || name.trim(),
        email: data.email || email.trim()
      })
      localStorage.setItem('username', data.name || name.trim())
      enqueueSnackbar('Perfil atualizado', { variant: 'success' })
      onClose()
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro ao salvar perfil', {
        variant: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar perfil</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Nome"
          margin="normal"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <TextField
          fullWidth
          label="E-mail"
          margin="normal"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <TextField
          fullWidth
          label="Nova senha"
          margin="normal"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          helperText="Deixe em branco para manter a senha atual"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(v => !v)} edge="end">
                    {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
