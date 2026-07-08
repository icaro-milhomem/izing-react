import { Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore, getPostLoginPath } from '@/store/authStore'
import { SuperProfileGuard } from '@/components/SuperProfileGuard'
import { SocketProvider } from '@/providers/SocketProvider'
import { PageLoader } from '@/components/PageLoader'
import type { AuthUser } from '@/types/auth'

function resolveProfile(user: AuthUser | null): AuthUser['profile'] {
  const raw = user?.profile || localStorage.getItem('profile') || 'user'
  const value = raw.trim().toLowerCase()
  if (value === 'admin' || value === 'super' || value === 'user') return value
  return 'user'
}

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <SocketProvider>
      <SuperProfileGuard>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </SuperProfileGuard>
    </SocketProvider>
  )
}

export function PublicRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)

  if (isAuthenticated) {
    return <Navigate to={getPostLoginPath(resolveProfile(user))} replace />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}
