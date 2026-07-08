import { Navigate } from 'react-router-dom'
import { getPostLoginPath, useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/types/auth'

function normalizeProfile(profile?: string | null): AuthUser['profile'] {
  const value = (profile || 'user').trim().toLowerCase()
  if (value === 'admin' || value === 'super' || value === 'user') return value
  return 'user'
}

export function ProfileDefaultRedirect() {
  const user = useAuthStore(s => s.user)
  const profile = normalizeProfile(user?.profile || localStorage.getItem('profile'))
  return <Navigate to={getPostLoginPath(profile)} replace />
}
