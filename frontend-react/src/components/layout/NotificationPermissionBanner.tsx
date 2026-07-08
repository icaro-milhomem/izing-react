import { useEffect, useState } from 'react'
import { Alert, Button } from '@mui/material'
import { useSnackbar } from 'notistack'
import {
  canUseBrowserNotifications,
  getBrowserNotificationBlockReason
} from '@/utils/notifications'

export function NotificationPermissionBanner({ profile }: { profile: string | null }) {
  const { enqueueSnackbar } = useSnackbar()
  const [needsPermission, setNeedsPermission] = useState(false)
  const [insecureReason, setInsecureReason] = useState<string | null>(null)

  useEffect(() => {
    const update = () => {
      const blockReason = getBrowserNotificationBlockReason()
      setInsecureReason(blockReason)
      setNeedsPermission(
        canUseBrowserNotifications() && Notification.permission !== 'granted'
      )
    }
    update()
    window.addEventListener('focus', update)
    return () => window.removeEventListener('focus', update)
  }, [])

  if (profile !== 'admin' && profile !== 'user' && profile !== 'super') {
    return null
  }

  if (insecureReason) {
    return (
      <Alert severity="info" sx={{ borderRadius: 0 }}>
        {insecureReason} O som e o aviso dentro do sistema continuam funcionando.
      </Alert>
    )
  }

  if (!needsPermission) {
    return null
  }

  const activate = async () => {
    if (!canUseBrowserNotifications()) {
      enqueueSnackbar(getBrowserNotificationBlockReason() || 'Notificações indisponíveis.', {
        variant: 'warning'
      })
      return
    }

    const result = await Notification.requestPermission()
    setNeedsPermission(result !== 'granted')

    if (result === 'granted') {
      enqueueSnackbar('Notificações do sistema ativadas.', { variant: 'success' })
    } else {
      enqueueSnackbar('Permissão negada. Verifique as configurações do navegador.', {
        variant: 'warning'
      })
    }
  }

  return (
    <Alert
      severity="warning"
      sx={{ borderRadius: 0 }}
      action={
        <Button color="inherit" size="small" onClick={activate}>
          Ativar
        </Button>
      }
    >
      Ative as notificações do sistema para receber popup com o navegador minimizado.
    </Alert>
  )
}
