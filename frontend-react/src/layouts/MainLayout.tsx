import { Suspense, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Alert,
  Box,
  IconButton,
  Toolbar,
  Typography
} from '@mui/material'
import { Menu } from 'lucide-react'
import { SidebarNav, DRAWER_WIDTH } from '@/components/SidebarNav'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { PageLoader } from '@/components/PageLoader'
import { UserMenu } from '@/components/layout/UserMenu'
import { NotificationMenu } from '@/components/layout/NotificationMenu'
import { NotificationPermissionBanner } from '@/components/layout/NotificationPermissionBanner'
import { useAuthStore } from '@/store/authStore'
import { logout as logoutRequest } from '@/api/auth'
import { useWhatsappStore } from '@/store/whatsappStore'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAuthStore(s => s.user)
  const logoutStore = useAuthStore(s => s.logout)
  const navigate = useNavigate()
  const profile = user?.profile || localStorage.getItem('profile')
  const username = user?.username || localStorage.getItem('username')
  const whatsapps = useWhatsappStore(s => s.sessions)
  const channelProblem = whatsapps.some(w =>
    ['PAIRING', 'TIMEOUT', 'DISCONNECTED'].includes(w.status)
  )
  const qrPending = whatsapps.some(w => w.status === 'qrcode' || w.status === 'DESTROYED')

  const handleLogout = async () => {
    try {
      await logoutRequest(user?.userId || Number(localStorage.getItem('userId')))
    } catch {
      /* ignore */
    }
    logoutStore()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        <SidebarNav
          profile={profile}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <AppBar
            position="sticky"
            elevation={0}
            color="inherit"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Toolbar>
              <IconButton
                edge="start"
                sx={{ mr: 2, display: { md: 'none' } }}
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={22} strokeWidth={2} />
              </IconButton>
              <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
                <BrandLogo size="sm" />
              </Box>
              <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />
              {(profile === 'admin' || profile === 'user' || profile === 'super') && <NotificationMenu />}
              <UserMenu username={username} profile={profile} onLogout={handleLogout} />
            </Toolbar>
          </AppBar>

          <NotificationPermissionBanner profile={profile} />

          {profile === 'admin' && (channelProblem || qrPending) && (
            <Alert
              severity={channelProblem ? 'error' : 'warning'}
              sx={{ borderRadius: 0 }}
              action={
                <Typography
                  component="button"
                  variant="body2"
                  sx={{ border: 0, bgcolor: 'transparent', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => navigate('/sessoes')}
                >
                  Abrir Canais
                </Typography>
              }
            >
              {channelProblem
                ? 'Há canal WhatsApp desconectado ou com problema de conexão.'
                : 'Há canal aguardando leitura do QR Code.'}
            </Alert>
          )}

          <Box sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </Box>
        </Box>
      </Box>
  )
}
