import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useSnackbar } from 'notistack'
import type { SnackbarKey, OptionsObject } from 'notistack'

export type InAppNotifier = {
  enqueueSnackbar: (message: ReactNode, options?: OptionsObject) => SnackbarKey
  closeSnackbar: (key?: SnackbarKey) => void
}

let globalNotifier: InAppNotifier | null = null

export function setGlobalNotifier(notifier: InAppNotifier | null) {
  globalNotifier = notifier
}

export function getGlobalNotifier(): InAppNotifier | null {
  return globalNotifier
}

export function SnackbarUtilsConfigurator() {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()

  useEffect(() => {
    const notifier = { enqueueSnackbar, closeSnackbar }
    setGlobalNotifier(notifier)
    return () => setGlobalNotifier(null)
  }, [enqueueSnackbar, closeSnackbar])

  return null
}
