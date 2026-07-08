import { useMemo } from 'react'
import type { ApexOptions } from 'apexcharts'
import { useTheme } from '@mui/material'

export function useApexChartBaseOptions(): ApexOptions {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return useMemo(
    () => ({
      theme: { mode: isDark ? 'dark' : 'light' },
      chart: {
        foreColor: theme.palette.text.secondary,
        toolbar: { show: false }
      },
      grid: {
        borderColor: isDark ? '#404040' : '#e7e7e7'
      },
      legend: {
        labels: { colors: theme.palette.text.primary }
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light'
      }
    }),
    [isDark, theme.palette.text.primary, theme.palette.text.secondary]
  )
}
