import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  CircularProgress
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { getBusinessHours, updateBusinessHours, updateBusinessHoursMessage } from '@/api/tenants'

interface DayHour {
  day: number
  label: string
  type: string
  hr1: string
  hr2: string
  hr3: string
  hr4: string
}

const defaultDays: DayHour[] = [
  { day: 0, label: 'Domingo', type: 'O', hr1: '08:00', hr2: '12:00', hr3: '14:00', hr4: '18:00' },
  { day: 1, label: 'Segunda-Feira', type: 'O', hr1: '08:00', hr2: '12:00', hr3: '14:00', hr4: '18:00' },
  { day: 2, label: 'Terça-Feira', type: 'O', hr1: '08:00', hr2: '12:00', hr3: '14:00', hr4: '18:00' },
  { day: 3, label: 'Quarta-Feira', type: 'O', hr1: '08:00', hr2: '12:00', hr3: '14:00', hr4: '18:00' },
  { day: 4, label: 'Quinta-Feira', type: 'O', hr1: '08:00', hr2: '12:00', hr3: '14:00', hr4: '18:00' },
  { day: 5, label: 'Sexta-Feira', type: 'O', hr1: '08:00', hr2: '12:00', hr3: '14:00', hr4: '18:00' },
  { day: 6, label: 'Sábado', type: 'O', hr1: '08:00', hr2: '12:00', hr3: '14:00', hr4: '18:00' }
]

export function HorarioAtendimentoPage() {
  const profile = localStorage.getItem('profile')
  const { enqueueSnackbar } = useSnackbar()
  const [days, setDays] = useState<DayHour[]>(defaultDays)
  const [absenceMessage, setAbsenceMessage] = useState('')

  const { isLoading } = useQuery({
    queryKey: ['business-hours'],
    queryFn: async () => {
      const { data } = await getBusinessHours()
      const payload = data as { businessHours?: DayHour[]; messageBusinessHours?: string }
      if (payload.businessHours?.length) setDays(payload.businessHours)
      if (payload.messageBusinessHours) setAbsenceMessage(payload.messageBusinessHours)
      return data
    }
  })

  const updateDay = (index: number, patch: Partial<DayHour>) => {
    setDays(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  const saveHours = async () => {
    try {
      await updateBusinessHours({ businessHours: days })
      enqueueSnackbar('Horários salvos', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  const saveMessage = async () => {
    try {
      await updateBusinessHoursMessage({ messageBusinessHours: absenceMessage })
      enqueueSnackbar('Mensagem de ausência salva', { variant: 'success' })
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    }
  }

  if (isLoading) return <CircularProgress />

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Horário de Atendimento" action={<Button variant="contained" onClick={saveHours}>Salvar horários</Button>} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {days.map((day, index) => (
          <Card key={day.day} sx={{ width: { xs: '100%', sm: 'calc(33% - 12px)', md: 'calc(25% - 12px)' } }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{day.label}</Typography>
              <FormControl>
                <RadioGroup row value={day.type} onChange={e => updateDay(index, { type: e.target.value })}>
                  <FormControlLabel value="O" control={<Radio size="small" />} label="Aberto" />
                  <FormControlLabel value="C" control={<Radio size="small" />} label="Fechado" />
                  <FormControlLabel value="H" control={<Radio size="small" />} label="Horário" />
                </RadioGroup>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <TextField type="time" size="small" disabled={day.type !== 'H'} value={day.hr1} onChange={e => updateDay(index, { hr1: e.target.value })} />
                <TextField type="time" size="small" disabled={day.type !== 'H'} value={day.hr2} onChange={e => updateDay(index, { hr2: e.target.value })} />
                <TextField type="time" size="small" disabled={day.type !== 'H'} value={day.hr3} onChange={e => updateDay(index, { hr3: e.target.value })} />
                <TextField type="time" size="small" disabled={day.type !== 'H'} value={day.hr4} onChange={e => updateDay(index, { hr4: e.target.value })} />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Mensagem de Ausência</Typography>
            <Button variant="contained" onClick={saveMessage}>Salvar mensagem</Button>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={absenceMessage}
            onChange={e => setAbsenceMessage(e.target.value)}
            placeholder="Mensagem enviada fora do horário..."
          />
        </CardContent>
      </Card>
    </AdminOnly>
  )
}
