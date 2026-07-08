import * as XLSX from 'xlsx'

export function printReportTable(tableId: string, title = 'Relatório') {
  const table = document.getElementById(tableId)
  if (!table) return

  const win = window.open('', '_blank')
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 16px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #eee; }
</style></head><body><h2>${title}</h2>${table.outerHTML}</body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

export function exportTableToExcel(tableId: string, filename: string, sheetName = 'Relatório') {
  const table = document.getElementById(tableId)
  if (!table) return

  const sheet = XLSX.utils.table_to_sheet(table, { raw: true })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, sheetName)
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export function exportJsonToExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = 'Relatório'
) {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export function exportRowsToCsv(
  rows: Record<string, unknown>[],
  columns: Array<{ key: string; label: string }>,
  filename: string
) {
  const header = columns.map(c => c.label).join(';')
  const lines = rows.map(row =>
    columns
      .map(c => {
        const val = row[c.key]
        const s = val == null ? '' : String(val)
        return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
      })
      .join(';')
  )
  const blob = new Blob(['\ufeff' + [header, ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;'
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
