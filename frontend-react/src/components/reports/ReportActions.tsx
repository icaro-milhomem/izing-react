import { Box, Button } from '@mui/material'
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined'
import TableViewOutlinedIcon from '@mui/icons-material/TableViewOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import {
  exportRowsToCsv,
  exportTableToExcel,
  printReportTable
} from '@/utils/reportExport'

interface ReportActionsProps {
  tableId: string
  title: string
  exportFilename: string
  rows?: Record<string, unknown>[]
  columns?: Array<{ key: string; label: string }>
  disabled?: boolean
}

export function ReportActions({
  tableId,
  title,
  exportFilename,
  rows,
  columns,
  disabled
}: ReportActionsProps) {
  const hasData = Boolean(rows?.length)
  const canCsv = hasData && columns?.length

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<PrintOutlinedIcon />}
        disabled={disabled || !hasData}
        onClick={() => printReportTable(tableId, title)}
      >
        Imprimir
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<TableViewOutlinedIcon />}
        disabled={disabled || !hasData}
        onClick={() => exportTableToExcel(tableId, exportFilename)}
      >
        Excel
      </Button>
      {canCsv && columns && rows && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          disabled={disabled}
          onClick={() =>
            exportRowsToCsv(rows, columns, exportFilename.replace(/\.xlsx$/i, '.csv'))
          }
        >
          CSV
        </Button>
      )}
    </Box>
  )
}
