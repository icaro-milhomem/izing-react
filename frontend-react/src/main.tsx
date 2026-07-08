import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SnackbarProvider } from 'notistack'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { AppThemeProvider } from './providers/AppThemeProvider'
import { SnackbarUtilsConfigurator } from './utils/snackbarUtils'
import { useAuthStore } from './store/authStore'

const queryClient = new QueryClient()

if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

function Root() {
  const hydrate = useAuthStore(s => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <SnackbarProvider maxSnack={5} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <SnackbarUtilsConfigurator />
            <App />
          </SnackbarProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
