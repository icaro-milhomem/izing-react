import { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Paper,
  TextField,
  Typography
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { updateUserConfigs } from '@/api/users'
import { useAppTheme } from '@/providers/AppThemeProvider'
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  persistThemeToStorage,
  type ThemeColors
} from '@/utils/themeApply'

export function ThemeEditor() {
  const { colors, setColors, mode } = useAppTheme()
  const [themeColors, setThemeColors] = useState<ThemeColors>(colors)
  const [saving, setSaving] = useState(false)
  const { enqueueSnackbar } = useSnackbar()

  const applyLocal = (next: ThemeColors) => {
    setThemeColors(next)
    setColors(next)
  }

  const saveTheme = async () => {
    setSaving(true)
    try {
      const userId = Number(localStorage.getItem('userId'))
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}') as Record<string, unknown>
      const configs = {
        ...(usuario.configs as Record<string, unknown> | undefined),
        theme: themeColors,
        isDark: mode === 'dark'
      }
      await updateUserConfigs(userId, configs)
      persistThemeToStorage(themeColors)
      setColors(themeColors)
      enqueueSnackbar('Tema salvo com sucesso', { variant: 'success' })
    } catch {
      enqueueSnackbar('Erro ao salvar tema', { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const resetTheme = () => applyLocal(DEFAULT_THEME)

  return (
    <Paper sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        Personalização de Tema
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Personalize as cores do sistema conforme sua preferência
      </Typography>

      {(['primary', 'secondary', 'accent'] as const).map(key => (
        <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 600 }}>
            {key === 'primary' ? 'Cor Primária' : key === 'secondary' ? 'Cor Secundária' : 'Cor de Destaque'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              type="color"
              size="small"
              value={themeColors[key]}
              onChange={e => applyLocal({ ...themeColors, [key]: e.target.value })}
              sx={{ width: 72 }}
            />
            <TextField
              size="small"
              value={themeColors[key]}
              onChange={e => applyLocal({ ...themeColors, [key]: e.target.value })}
              sx={{ width: 120 }}
            />
          </Box>
        </Box>
      ))}

      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained">Botão Primário</Button>
        <Button variant="outlined" color="secondary">Botão Destaque</Button>
        <Chip label="Chip" color="primary" />
      </Box>

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>
        Temas pré-definidos
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {THEME_PRESETS.map(preset => (
          <Button
            key={preset.name}
            size="small"
            variant="outlined"
            sx={{ borderColor: preset.primary, color: preset.primary }}
            onClick={() => applyLocal({ primary: preset.primary, secondary: preset.secondary, accent: preset.accent })}
          >
            {preset.name}
          </Button>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={saveTheme} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar Tema'}
        </Button>
        <Button variant="outlined" onClick={resetTheme}>Resetar</Button>
      </Box>
    </Paper>
  )
}
