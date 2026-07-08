import { FormControlLabel, Switch, Tooltip } from '@mui/material'
import { Moon, Sun } from 'lucide-react'
import { useAppTheme } from '@/providers/AppThemeProvider'
import { useBrandTokens } from '@/hooks/useBrandTokens'

interface DarkModeToggleProps {
  dense?: boolean
  variant?: 'default' | 'sidebar'
}

export function DarkModeToggle({ dense, variant = 'default' }: DarkModeToggleProps) {
  const { mode, toggleDarkMode } = useAppTheme()
  const { sidebar } = useBrandTokens()
  const isDark = mode === 'dark'
  const onSidebar = variant === 'sidebar'

  return (
    <Tooltip title={isDark ? 'Desativar modo escuro' : 'Ativar modo escuro'}>
      <FormControlLabel
        sx={{
          mx: dense ? 0 : onSidebar ? 0 : 1,
          px: dense ? 0 : onSidebar ? 0 : 1,
          py: dense ? 0 : 0.5,
          width: dense || onSidebar ? '100%' : '100%',
          justifyContent: 'space-between',
          color: onSidebar ? sidebar.text : 'inherit',
          '& .MuiFormControlLabel-label': {
            fontSize: '0.88rem',
            fontWeight: 600,
            color: onSidebar ? sidebar.text : 'inherit'
          }
        }}
        labelPlacement="start"
        control={
          <Switch
            size={dense ? 'small' : 'medium'}
            checked={isDark}
            onChange={toggleDarkMode}
            icon={<Sun size={14} strokeWidth={2.5} />}
            checkedIcon={<Moon size={14} strokeWidth={2.5} />}
          />
        }
        label={dense ? undefined : 'Modo escuro'}
      />
    </Tooltip>
  )
}
