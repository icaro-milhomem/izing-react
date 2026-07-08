import {
  Box,
  Button,
  Checkbox,
  Drawer,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography
} from '@mui/material'
import type { Queue } from '@/types/entities'
import type { TicketFilters } from '@/types/entities'

interface TicketFiltersDrawerProps {
  open: boolean
  filters: TicketFilters
  filas: Queue[]
  isAdmin: boolean
  onClose: () => void
  onChange: (filters: TicketFilters) => void
}

export function TicketFiltersDrawer({
  open,
  filters,
  filas,
  isAdmin,
  onClose,
  onChange
}: TicketFiltersDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 320, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Filtros</Typography>

        {isAdmin && (
          <FormControlLabel
            control={
              <Switch
                checked={filters.showAll}
                onChange={e => onChange({ ...filters, showAll: e.target.checked })}
              />
            }
            label="(Admin) Ver todos"
            sx={{ display: 'block', mb: 2 }}
          />
        )}

        {!filters.showAll && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Filas</InputLabel>
            <Select
              multiple
              label="Filas"
              value={filters.queuesIds}
              onChange={e => onChange({ ...filters, queuesIds: e.target.value as number[] })}
              renderValue={selected =>
                filas.filter(f => selected.includes(f.id)).map(f => f.queue).join(', ') || 'Todas'
              }
            >
              {filas.map(f => (
                <MenuItem key={f.id} value={f.id}>
                  <Checkbox checked={filters.queuesIds.includes(f.id)} />
                  {f.queue}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={filters.withUnreadMessages}
              onChange={e => onChange({ ...filters, withUnreadMessages: e.target.checked })}
            />
          }
          label="Somente não lidos"
          sx={{ display: 'block', mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={filters.isNotAssignedUser}
              onChange={e => onChange({ ...filters, isNotAssignedUser: e.target.checked })}
            />
          }
          label="Somente não atribuídos"
          sx={{ display: 'block', mb: 2 }}
        />

        <Button variant="contained" fullWidth onClick={onClose}>
          Aplicar
        </Button>
      </Box>
    </Drawer>
  )
}
