import { useState } from 'react'
import {
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography
} from '@mui/material'
import { LogOut, User } from 'lucide-react'
import { ActionIconButton } from '@/components/icons/ActionIconButton'
import { UserStatusSelect } from '@/components/UserStatusSelect'
import { ProfileDialog } from '@/components/layout/ProfileDialog'
import { SystemVersion } from '@/components/layout/SystemVersion'
import { useAppTheme } from '@/providers/AppThemeProvider'

interface UserMenuProps {
  username?: string | null
  profile?: string | null
  onLogout: () => void
}

function initials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function UserMenu({ username, profile, onLogout }: UserMenuProps) {
  const { colors } = useAppTheme()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const open = Boolean(anchor)

  return (
    <>
      <ActionIconButton title="Conta" onClick={e => setAnchor(e.currentTarget)} sx={{ p: 0.5, ml: 1 }}>
        <Avatar
          sx={{
            width: 34,
            height: 34,
            fontSize: 13,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`
          }}
        >
          {initials(username)}
        </Avatar>
      </ActionIconButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 240, borderRadius: 3, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Olá!
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {username}
          </Typography>
        </Box>
        {(profile === 'admin' || profile === 'user') && (
          <Box sx={{ px: 2, pb: 1 }}>
            <UserStatusSelect />
          </Box>
        )}
        <MenuItem
          onClick={() => {
            setAnchor(null)
            setProfileOpen(true)
          }}
        >
          <ListItemIcon>
            <User size={18} strokeWidth={2.25} />
          </ListItemIcon>
          <ListItemText>Perfil</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null)
            onLogout()
          }}
        >
          <ListItemIcon>
            <LogOut size={18} strokeWidth={2.25} />
          </ListItemIcon>
          <ListItemText>Sair</ListItemText>
        </MenuItem>
        <Divider />
        <Box sx={{ px: 1 }}>
          <SystemVersion />
        </Box>
      </Menu>
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
