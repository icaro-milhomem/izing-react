import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ThemeEditor } from '@/components/ThemeEditor'
import { listSettings, updateSetting } from '@/api/settings'
import { listChatFlows } from '@/api/chatFlow'

const TOGGLE_KEYS = [
  {
    key: 'NotViewAssignedTickets',
    label: 'Não visualizar tickets atribuídos a outros usuários',
    caption: 'Somente o responsável e administradores verão o atendimento.'
  },
  {
    key: 'NotViewTicketsChatBot',
    label: 'Não visualizar tickets no ChatBot',
    caption: 'Somente administradores verão tickets com o bot ativo.'
  },
  {
    key: 'DirectTicketsToWallets',
    label: 'Forçar atendimento via Carteira',
    caption: 'Direciona atendimento aos donos da carteira do contato.'
  },
  {
    key: 'ignoreGroupMsg',
    label: 'Ignorar mensagens de grupos',
    caption: 'Não abrir ticket para mensagens recebidas em grupos.'
  },
  {
    key: 'rejectCalls',
    label: 'Rejeitar chamadas de voz/vídeo',
    caption: 'Envia mensagem automática ao rejeitar chamadas.'
  }
]

export function ConfiguracoesPage() {
  const profile = localStorage.getItem('profile')
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [values, setValues] = useState<Record<string, string>>({})

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await listSettings()
      localStorage.setItem('configuracoes', JSON.stringify(data))
      return data
    }
  })

  const { data: flows = [] } = useQuery({
    queryKey: ['chatFlows'],
    queryFn: async () => (await listChatFlows()).data
  })

  useEffect(() => {
    const map: Record<string, string> = {}
    settings.forEach(s => {
      map[s.key] = s.value
    })
    setValues(map)
  }, [settings])

  const save = async (key: string, value: string) => {
    try {
      await updateSetting(key, { value, key })
      setValues(v => ({ ...v, [key]: value }))
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      enqueueSnackbar('Configuração salva', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  const botTicketValue = values.botTicketActive || ''
  const botTicketOptions = flows.map(f => String(f.id))
  const botTicketSelectValue =
    botTicketValue && botTicketOptions.includes(botTicketValue) ? botTicketValue : ''

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Configurações" subtitle="Módulo de atendimento" />
      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <Paper sx={{ p: 2 }}>
            {TOGGLE_KEYS.map(item => (
              <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.caption}</Typography>
                </Box>
                <Switch
                  checked={values[item.key] === 'enabled'}
                  onChange={e => save(item.key, e.target.checked ? 'enabled' : 'disabled')}
                />
              </Box>
            ))}

            {values.rejectCalls === 'enabled' && (
              <Box sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>Mensagem ao rejeitar chamada</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  value={values.callRejectMessage || ''}
                  onBlur={e => save('callRejectMessage', e.target.value)}
                  onChange={e => setValues(v => ({ ...v, callRejectMessage: e.target.value }))}
                />
              </Box>
            )}

            <Box sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Token NotificaME (hub)</Typography>
              <TextField
                fullWidth
                value={values.hubToken || ''}
                onBlur={e => save('hubToken', e.target.value)}
                onChange={e => setValues(v => ({ ...v, hubToken: e.target.value }))}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>Intervalo entre mensagens automáticas</Typography>
                <Typography variant="caption" color="text.secondary">
                  Horas de espera antes de reenviar mensagens automáticas de atendimento ao mesmo contato (0 = desativado)
                </Typography>
              </Box>
              <TextField
                type="number"
                size="small"
                sx={{ width: 100 }}
                slotProps={{ htmlInput: { min: 0, max: 168 } }}
                value={values.autoMessageCooldownHours ?? '24'}
                onBlur={e => save('autoMessageCooldownHours', e.target.value || '24')}
                onChange={e => setValues(v => ({ ...v, autoMessageCooldownHours: e.target.value }))}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>Fluxo ativo para o Bot</Typography>
                <Typography variant="caption" color="text.secondary">Fluxo usado pelo bot nos novos atendimentos</Typography>
              </Box>
              <FormControl sx={{ minWidth: 220 }} size="small">
                <InputLabel>Fluxo</InputLabel>
                <Select
                  label="Fluxo"
                  value={botTicketSelectValue}
                  onChange={e => save('botTicketActive', String(e.target.value))}
                >
                  <MenuItem value="">Nenhum</MenuItem>
                  {flows.map(f => (
                    <MenuItem key={f.id} value={String(f.id)}>{f.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Paper>

          <ThemeEditor />
        </>
      )}
    </AdminOnly>
  )
}
