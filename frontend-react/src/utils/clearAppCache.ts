const PRESERVED_LOCAL_KEYS = new Set([
  'token',
  'usuario',
  'username',
  'profile',
  'userId',
  'queues',
  'filasCadastradas',
  'configuracoes',
  'filtrosAtendimento',
  'notificationSoundSettings'
])

export async function clearAppCache(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(registration => registration.unregister()))
  }

  const preserved: Record<string, string> = {}
  for (const key of PRESERVED_LOCAL_KEYS) {
    const value = localStorage.getItem(key)
    if (value != null) preserved[key] = value
  }

  localStorage.clear()
  Object.entries(preserved).forEach(([key, value]) => {
    localStorage.setItem(key, value)
  })

  sessionStorage.clear()
  window.location.reload()
}
