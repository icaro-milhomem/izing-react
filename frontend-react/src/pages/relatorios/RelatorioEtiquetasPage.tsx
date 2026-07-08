import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import { Link } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { AdminOnly, PageHeader } from '@/components/PageHeader'
import { ReportActions } from '@/components/reports/ReportActions'
import { getContactsReport } from '@/api/statistics'
import { listTags } from '@/api/tags'

const TAG_COLUMNS = [
  { key: 'name', label: 'Nome' },
  { key: 'number', label: 'Número' },
  { key: 'email', label: 'E-mail' }
]

const STATE_COLUMNS = [
  { key: 'state', label: 'Estado/DDD' },
  { key: 'name', label: 'Nome' },
  { key: 'number', label: 'Número' }
]

export function RelatorioEtiquetasPage() {
  const profile = localStorage.getItem('profile')
  const { enqueueSnackbar } = useSnackbar()
  const [tagIds, setTagIds] = useState<number[]>([])
  const [contacts, setContacts] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await listTags(true)).data
  })

  const gerar = async () => {
    if (!tagIds.length) {
      enqueueSnackbar('Selecione ao menos uma etiqueta', { variant: 'warning' })
      return
    }
    setLoading(true)
    try {
      const { data } = await getContactsReport({ tags: tagIds, agrupamento: 'tags' })
      setContacts((data as { contacts?: Array<Record<string, unknown>> }).contacts || [])
    } catch (err: unknown) {
      enqueueSnackbar((err as { userMessage?: string }).userMessage || 'Erro', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Contatos por Etiqueta" action={<Button component={Link} to="/relatorios">Voltar</Button>} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 280 }}>
          <InputLabel>Etiquetas</InputLabel>
          <Select
            multiple
            value={tagIds}
            onChange={e => setTagIds(e.target.value as number[])}
            input={<OutlinedInput label="Etiquetas" />}
            renderValue={selected => tags.filter(t => selected.includes(t.id)).map(t => t.tag).join(', ')}
          >
            {tags.map(tag => (
              <MenuItem key={tag.id} value={tag.id}>
                <Checkbox checked={tagIds.includes(tag.id)} />
                <ListItemText primary={tag.tag} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={gerar} disabled={loading}>Gerar</Button>
      </Box>
      <ReportActions
        tableId="report-tags"
        title="Contatos por Etiqueta"
        exportFilename="contatos_etiquetas.xlsx"
        rows={contacts}
        columns={TAG_COLUMNS}
        disabled={loading}
      />
      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small" id="report-tags">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Número</TableCell>
                <TableCell>E-mail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{String(c.name || '—')}</TableCell>
                  <TableCell>{String(c.number || '—')}</TableCell>
                  <TableCell>{String(c.email || '—')}</TableCell>
                </TableRow>
              ))}
              {!contacts.length && (
                <TableRow><TableCell colSpan={3} align="center"><Typography color="text.secondary">Sem dados</Typography></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminOnly>
  )
}

export function RelatorioEstadoPage() {
  const profile = localStorage.getItem('profile')
  const [contacts, setContacts] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)

  const gerar = async () => {
    setLoading(true)
    try {
      const { data } = await getContactsReport({ agrupamento: 'state' })
      setContacts((data as { contacts?: Array<Record<string, unknown>> }).contacts || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminOnly profile={profile}>
      <PageHeader title="Contatos por Estado" action={<Button component={Link} to="/relatorios">Voltar</Button>} />
      <Button variant="contained" sx={{ mb: 2 }} onClick={gerar} disabled={loading}>Gerar</Button>
      <ReportActions
        tableId="report-state"
        title="Contatos por Estado"
        exportFilename="contatos_estado.xlsx"
        rows={contacts}
        columns={STATE_COLUMNS}
        disabled={loading}
      />
      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small" id="report-state">
            <TableHead>
              <TableRow>
                <TableCell>Estado/DDD</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Número</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{String(c.state || c.ddd || '—')}</TableCell>
                  <TableCell>{String(c.name || '—')}</TableCell>
                  <TableCell>{String(c.number || '—')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminOnly>
  )
}
