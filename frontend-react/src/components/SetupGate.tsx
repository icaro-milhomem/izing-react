import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSetupStatus, SETUP_STATUS_QUERY_KEY } from '@/api/setup'
import { PageLoader } from '@/components/PageLoader'
import { getPostLoginPath, useAuthStore } from '@/store/authStore'

interface SetupGateProps {
  children: ReactNode
}

export function SetupGate({ children }: SetupGateProps) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const user = useAuthStore(s => s.user)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: SETUP_STATUS_QUERY_KEY,
    queryFn: async () => (await getSetupStatus()).data,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  })

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: SETUP_STATUS_QUERY_KEY })
  }, [location.pathname, queryClient])

  const checking = isLoading || (isFetching && data === undefined)
  if (checking) {
    return <PageLoader />
  }

  const initialized = Boolean(data?.initialized)
  const onSetupPage = location.pathname === '/primeiro-acesso'

  if (!initialized && !onSetupPage) {
    return <Navigate to="/primeiro-acesso" replace />
  }

  if (initialized && onSetupPage) {
    if (isAuthenticated) {
      const profile = user?.profile || localStorage.getItem('profile')
      return <Navigate to={getPostLoginPath(profile)} replace />
    }
    return <Navigate to="/login" replace />
  }

  return children
}
