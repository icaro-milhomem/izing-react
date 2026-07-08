import { updateUserConfigs } from '@/api/users'

export function loadUserConfigs(): Record<string, unknown> {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as {
      configs?: Record<string, unknown>
    } | null
    return usuario?.configs || {}
  } catch {
    return {}
  }
}

export function loadDarkModeFromStorage(): boolean {
  if (Boolean(loadUserConfigs().isDark)) return true
  return localStorage.getItem('izingDarkMode') === 'true'
}

export function persistDarkModePreference(isDark: boolean) {
  localStorage.setItem('izingDarkMode', String(isDark))
}

export function persistUserConfigs(patch: Record<string, unknown>): Record<string, unknown> {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null') as Record<string, unknown> | null
    if (!usuario) return patch
    const configs = { ...(usuario.configs as Record<string, unknown> | undefined), ...patch }
    localStorage.setItem('usuario', JSON.stringify({ ...usuario, configs }))
    return configs
  } catch {
    return patch
  }
}

export async function saveUserConfigs(patch: Record<string, unknown>): Promise<void> {
  const configs = persistUserConfigs(patch)
  const userId = Number(localStorage.getItem('userId'))
  if (!userId) return
  try {
    await updateUserConfigs(userId, configs)
  } catch {
    /* ignore — preferência fica no localStorage */
  }
}
