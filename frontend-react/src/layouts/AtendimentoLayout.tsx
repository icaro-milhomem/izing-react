import { Suspense, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, IconButton, Toolbar } from '@mui/material'
import { Menu } from 'lucide-react'
import { SidebarNav, DRAWER_WIDTH } from '@/components/SidebarNav'
import { PageLoader } from '@/components/PageLoader'
import { useAuthStore } from '@/store/authStore'

export function AtendimentoLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useAuthStore(s => s.user)
  const profile = user?.profile || localStorage.getItem('profile')

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <SidebarNav
        profile={profile}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            display: { xs: 'flex', md: 'none' },
            minHeight: 48,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu size={22} strokeWidth={2} />
          </IconButton>
        </Toolbar>

        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  )
}
