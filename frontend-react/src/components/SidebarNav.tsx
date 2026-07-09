import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Typography
} from '@mui/material'
import { Volume2 } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { NavIconBox } from '@/components/icons/NavIconBox'
import type { MenuItem } from '@/types/auth'
import { getMenuForProfile } from '@/config/navigation'
import { SystemVersion } from '@/components/layout/SystemVersion'
import { DarkModeToggle } from '@/components/layout/DarkModeToggle'
import { NotificationSoundDialog } from '@/components/layout/NotificationSoundDialog'
import { useWhatsappStore } from '@/store/whatsappStore'
import { useBrandTokens } from '@/hooks/useBrandTokens'

const DRAWER_WIDTH = 272

interface SidebarNavProps {
  profile: string | null
  mobileOpen: boolean
  onClose: () => void
}

export function SidebarNav({ profile, mobileOpen, onClose }: SidebarNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [soundOpen, setSoundOpen] = useState(false)
  const { mode, brand, sidebar } = useBrandTokens()
  const whatsapps = useWhatsappStore(s => s.sessions)
  const channelProblem = whatsapps.some(w =>
    ['PAIRING', 'TIMEOUT', 'DISCONNECTED'].includes(w.status)
  )

  const items = useMemo(() => getMenuForProfile(profile), [profile])

  const drawerPaperSx = {
    boxSizing: 'border-box' as const,
    width: DRAWER_WIDTH,
    background: sidebar.background,
    borderRight: `1px solid ${sidebar.border}`,
    color: sidebar.text
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ px: 2.5, minHeight: 76 }}>
        <BrandLogo size="sm" variant={mode === 'dark' ? 'onDark' : 'default'} />
      </Toolbar>

      <Box
        sx={{
          mx: 2,
          mb: 1.5,
          p: 1.5,
          borderRadius: 3,
          background: brand.gradientSoft,
          border: `1px solid ${sidebar.border}`
        }}
      >
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: brand.primaryLight }}>
          PLATAFORMA
        </Typography>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: sidebar.textActive, mt: 0.25 }}>
          Atendimento multicanal
        </Typography>
      </Box>

      <List sx={{ flex: 1, px: 1.5, py: 0.5, overflow: 'auto' }}>
        {items.map((item: MenuItem, index: number) => {
          const showDivider = profile === 'admin' && index === 4
          const selected =
            location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

          return (
            <Box key={item.path}>
              {showDivider && (
                <Typography
                  sx={{
                    px: 1.5,
                    pt: 1.5,
                    pb: 0.75,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    color: sidebar.textMuted
                  }}
                >
                  ADMINISTRAÇÃO
                </Typography>
              )}
              <ListItemButton
                selected={selected}
                onClick={() => {
                  navigate(item.path)
                  onClose()
                }}
                sx={{
                  py: 1.15,
                  px: 1.25,
                  gap: 1.25,
                  mb: 0.5,
                  borderRadius: 3,
                  color: selected ? sidebar.textActive : sidebar.text,
                  border: selected ? `1px solid ${sidebar.border}` : '1px solid transparent',
                  background: selected ? sidebar.itemActive : 'transparent',
                  '&:hover': {
                    bgcolor: sidebar.itemHover,
                    color: sidebar.textActive
                  },
                  ...(item.path === '/sessoes' && channelProblem && !selected
                    ? { color: '#FCA5A5', '& .MuiListItemText-primary': { color: '#FCA5A5' } }
                    : {})
                }}
              >
                <ListItemIcon sx={{ minWidth: 0 }}>
                  <NavIconBox
                    name={item.icon}
                    selected={selected}
                    tone={item.path === '/sessoes' && channelProblem ? 'error' : 'default'}
                    sidebar={sidebar}
                    brand={brand}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={item.caption}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: '0.9rem',
                        fontWeight: selected ? 700 : 600,
                        color: 'inherit'
                      }
                    },
                    secondary: {
                      sx: {
                        fontSize: '0.72rem',
                        lineHeight: 1.35,
                        mt: 0.2,
                        color: selected ? sidebar.captionSelected : sidebar.textMuted
                      }
                    }
                  }}
                />
              </ListItemButton>
            </Box>
          )
        })}
      </List>

      <Divider sx={{ borderColor: sidebar.border }} />
      <Box sx={{ px: 1.5, py: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <DarkModeToggle variant="sidebar" />
        {(profile === 'admin' || profile === 'user' || profile === 'super') && (
          <ListItemButton
            onClick={() => setSoundOpen(true)}
            sx={{
              borderRadius: 2,
              color: sidebar.text,
              '&:hover': { bgcolor: sidebar.itemHover, color: sidebar.textActive }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <Volume2 size={18} strokeWidth={2.25} />
            </ListItemIcon>
            <ListItemText
              primary="Som das notificações"
              slotProps={{ primary: { sx: { fontSize: 14 } } }}
            />
          </ListItemButton>
        )}
      </Box>
      <Divider sx={{ borderColor: sidebar.border }} />
      <Box
        sx={{
          py: 1,
          '& .MuiTypography-root': { color: sidebar.textMuted },
          '& .MuiChip-root': {
            bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : `${brand.primary}18`,
            color: mode === 'dark' ? '#fff' : sidebar.textActive
          }
        }}
      >
        <SystemVersion />
      </Box>
    </Box>
  )

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      <NotificationSoundDialog open={soundOpen} onClose={() => setSoundOpen(false)} />
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperSx
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': drawerPaperSx
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  )
}

export { DRAWER_WIDTH }
