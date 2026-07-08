import { useMemo } from 'react'
import {
  Avatar,
  Chip,
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent
} from '@mui/material'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import DoNotDisturbOnOutlinedIcon from '@mui/icons-material/DoNotDisturbOnOutlined'
import { useSnackbar } from 'notistack'
import { updateUserStatus } from '@/api/users'
import { useAuthStore } from '@/store/authStore'
import { emitUserPresence, getSocket } from '@/hooks/useSocket'

const STATUS_OPTIONS = [
  { value: 'online' as const, label: 'Online', color: 'success.main', icon: CheckCircleOutlineOutlinedIcon },
  { value: 'offline' as const, label: 'Offline', color: 'error.main', icon: DoNotDisturbOnOutlinedIcon }
]

export function UserStatusSelect() {
  const { enqueueSnackbar } = useSnackbar()
  const user = useAuthStore(s => s.user)
  const updateUsuario = useAuthStore(s => s.updateUsuario)

  const status = useMemo(() => {
    if (user?.status) return user.status
    try {
      const stored = JSON.parse(localStorage.getItem('usuario') || '{}') as { status?: string }
      return stored.status === 'offline' ? 'offline' : 'online'
    } catch {
      return 'online' as const
    }
  }, [user?.status])

  const current = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  const Icon = current.icon

  const handleChange = async (event: SelectChangeEvent<'online' | 'offline'>) => {
    const nextStatus = event.target.value as 'online' | 'offline'
    try {
      await updateUserStatus(nextStatus)
      updateUsuario({ status: nextStatus })
      emitUserPresence(getSocket())
      enqueueSnackbar(`Status: ${nextStatus === 'online' ? 'Online' : 'Offline'}`, { variant: 'success' })
    } catch {
      enqueueSnackbar('Erro ao atualizar status no servidor', { variant: 'error' })
    }
  }

  return (
    <FormControl size="small" sx={{ minWidth: 140, width: '100%' }}>
      <Select
        value={status}
        onChange={handleChange}
        variant="standard"
        disableUnderline
        renderValue={() => (
          <Chip
            size="small"
            avatar={
              <Avatar sx={{ bgcolor: current.color, width: 28, height: 28 }}>
                <Icon sx={{ fontSize: 16, color: 'common.white' }} />
              </Avatar>
            }
            label={current.label}
          />
        )}
      >
        {STATUS_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
