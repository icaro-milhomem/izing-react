import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getPostLoginPath, useAuthStore } from '@/store/authStore'

const SUPER_PATHS = ['/empresassuper', '/usuariossuper', '/sessaosuper', '/chat-interno']

function isSuperProfile(): boolean {
  const profile =
    useAuthStore.getState().user?.profile || localStorage.getItem('profile') || ''
  return profile.trim().toLowerCase() === 'super'
}

export function SuperProfileGuard({ children }: { children: ReactNode }) {
  const location = useLocation()

  if (!isSuperProfile()) {
    return children
  }

  const onSuperArea = SUPER_PATHS.some(
    path => location.pathname === path || location.pathname.startsWith(`${path}/`)
  )

  if (!onSuperArea) {
    return <Navigate to={getPostLoginPath('super')} replace state={{ from: location }} />
  }

  return children
}
