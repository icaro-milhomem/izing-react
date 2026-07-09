import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Slider,
  Typography
} from '@mui/material'
import { Volume2 } from 'lucide-react'
import {
  getNotificationSoundOption,
  getNotificationSoundSettings,
  NOTIFICATION_SOUND_GROUPS,
  previewNotificationSound,
  saveNotificationSoundSettings,
  type NotificationSoundId,
  type NotificationSoundSettings
} from '@/utils/notificationSoundSettings'

interface NotificationSoundSettingsProps {
  compact?: boolean
}

export function NotificationSoundSettings({ compact }: NotificationSoundSettingsProps) {
  const [settings, setSettings] = useState<NotificationSoundSettings>(() =>
    getNotificationSoundSettings()
  )

  useEffect(() => {
    saveNotificationSoundSettings(settings)
  }, [settings])

  const selected = getNotificationSoundOption(settings.sound)

  const update = (patch: Partial<NotificationSoundSettings>) => {
    setSettings(current => ({ ...current, ...patch }))
  }

  const testSound = (next?: NotificationSoundSettings) => {
    previewNotificationSound(next ?? settings)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: compact ? 1.5 : 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Volume2 size={18} strokeWidth={2.25} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Som das notificações
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary">
        Escolha um som e clique em testar. Ao trocar a opção, o som toca automaticamente.
      </Typography>

      <FormControl fullWidth size="small">
        <InputLabel id="notification-sound-label">Tipo de som</InputLabel>
        <Select
          labelId="notification-sound-label"
          label="Tipo de som"
          value={settings.sound}
          onChange={e => {
            const sound = e.target.value as NotificationSoundId
            const next = { ...settings, sound }
            update({ sound })
            testSound(next)
          }}
        >
          {NOTIFICATION_SOUND_GROUPS.map(group => [
            <ListSubheader key={`header-${group.title}`} sx={{ fontWeight: 700, lineHeight: '32px' }}>
              {group.title}
            </ListSubheader>,
            ...group.options.map(option => (
              <MenuItem key={option.id} value={option.id} sx={{ pl: 3 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {option.label}
                  </Typography>
                  {option.hint ? (
                    <Typography variant="caption" color="text.secondary">
                      {option.hint}
                    </Typography>
                  ) : null}
                </Box>
              </MenuItem>
            ))
          ])}
        </Select>
      </FormControl>

      {selected?.hint && settings.sound !== 'off' ? (
        <Typography variant="caption" color="text.secondary">
          Selecionado: {selected.label} — {selected.hint}
        </Typography>
      ) : null}

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Volume: {settings.volume}%
        </Typography>
        <Slider
          value={settings.volume}
          min={0}
          max={100}
          step={5}
          marks={[
            { value: 0, label: '0' },
            { value: 50, label: '50' },
            { value: 100, label: '100' }
          ]}
          disabled={settings.sound === 'off'}
          onChange={(_, value) => update({ volume: value as number })}
          valueLabelDisplay="auto"
        />
      </Box>

      <Button
        variant="outlined"
        size="small"
        onClick={() => testSound()}
        disabled={settings.sound === 'off' || settings.volume <= 0}
      >
        Testar som
      </Button>
    </Box>
  )
}
