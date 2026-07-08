import { useState } from 'react'
import { Button, CircularProgress } from '@mui/material'
import FacebookIcon from '@mui/icons-material/Facebook'
import { useSnackbar } from 'notistack'
import { registerFacebookPages } from '@/api/facebook'
import { resolveBackendError } from '@/api/backendErrors'
import { loadFacebookSdk, loginFacebookPages } from '@/utils/facebookSdk'
import type { WhatsappSession } from '@/types/entities'

const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || ''

interface FacebookConnectButtonProps {
  channel: WhatsappSession
  onConnected?: () => void
  variant?: 'contained' | 'outlined'
  size?: 'small' | 'medium'
}

export function FacebookConnectButton({
  channel,
  onConnected,
  variant = 'contained',
  size = 'small'
}: FacebookConnectButtonProps) {
  const [loading, setLoading] = useState(false)
  const { enqueueSnackbar } = useSnackbar()

  const handleConnect = async () => {
    if (!FB_APP_ID) {
      enqueueSnackbar('Configure VITE_FACEBOOK_APP_ID no .env do frontend', { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      await loadFacebookSdk(FB_APP_ID)
      const { accessToken, userID } = await loginFacebookPages()
      await registerFacebookPages({
        whatsapp: channel,
        accountId: userID,
        userToken: accessToken
      })
      enqueueSnackbar('Página Facebook vinculada', { variant: 'success' })
      onConnected?.()
    } catch (err: unknown) {
      enqueueSnackbar(resolveBackendError(err) || 'Erro ao vincular Facebook', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      color="primary"
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <FacebookIcon />}
      disabled={loading}
      onClick={() => void handleConnect()}
    >
      Vincular Facebook
    </Button>
  )
}
