import { alpha, createTheme, type Theme, type ThemeOptions } from '@mui/material/styles'
import type { ThemeColors } from '@/utils/themeApply'
import { surface } from '@/theme/colors'

const fontFamily = '"Plus Jakarta Sans", "Inter", "Roboto", sans-serif'

function buildShadows(isLight: boolean): Theme['shadows'] {
  const soft = isLight ? 'rgba(76, 29, 149, 0.08)' : 'rgba(0, 0, 0, 0.35)'
  return Array.from({ length: 25 }, (_, i) => {
    if (i === 0) return 'none'
    if (i === 1) return `0 1px 2px ${soft}`
    if (i === 2) return `0 8px 24px ${soft}`
    if (i === 3) return `0 16px 40px ${soft}`
    return `0 24px 48px ${soft}`
  }) as Theme['shadows']
}

export function createAppTheme(mode: 'light' | 'dark', colors: ThemeColors) {
  const isLight = mode === 'light'

  const options: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: colors.primary,
        light: alpha(colors.primary, 0.75),
        dark: '#5B21B6',
        contrastText: '#ffffff'
      },
      secondary: {
        main: colors.accent,
        light: alpha(colors.accent, 0.8),
        dark: '#0891B2'
      },
      success: { main: '#10B981', light: '#34D399', dark: '#059669' },
      warning: { main: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
      error: { main: '#EF4444', light: '#F87171', dark: '#DC2626' },
      info: { main: colors.accent, light: '#22D3EE', dark: '#0891B2' },
      background: isLight
        ? { default: colors.secondary || surface.lightBg, paper: surface.lightPaper }
        : { default: surface.darkBg, paper: surface.darkPaper },
      divider: isLight ? alpha('#4C1D95', 0.08) : alpha('#ffffff', 0.08),
      text: isLight
        ? { primary: '#1E1B4B', secondary: '#64748B' }
        : { primary: '#F1F5F9', secondary: '#94A3B8' }
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily,
      h4: { fontWeight: 700, letterSpacing: '-0.03em' },
      h5: { fontWeight: 600, letterSpacing: '-0.025em' },
      h6: { fontWeight: 600, letterSpacing: '-0.02em' },
      subtitle1: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' as const, letterSpacing: '-0.01em' }
    },
    shadows: buildShadows(isLight),
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isLight ? '#C4B5FD transparent' : '#334155 transparent'
          },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isLight ? '#C4B5FD' : '#334155',
            borderRadius: 999
          }
        }
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 14,
            paddingInline: 20,
            minHeight: 42
          }
        },
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              backgroundImage: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              boxShadow: `0 10px 28px ${alpha(colors.primary, 0.35)}`,
              '&:hover': {
                backgroundImage: `linear-gradient(135deg, ${alpha(colors.primary, 0.92)} 0%, ${alpha(colors.accent, 0.92)} 100%)`,
                boxShadow: `0 14px 32px ${alpha(colors.primary, 0.42)}`
              }
            }
          },
          {
            props: { variant: 'outlined' },
            style: {
              borderWidth: 1.5,
              borderColor: alpha(colors.primary, 0.35),
              '&:hover': {
                borderColor: colors.primary,
                bgcolor: alpha(colors.primary, 0.06)
              }
            }
          }
        ]
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: `1px solid ${isLight ? alpha(colors.primary, 0.08) : alpha('#ffffff', 0.08)}`,
            backgroundImage: isLight
              ? `linear-gradient(180deg, #ffffff 0%, ${alpha(colors.secondary, 0.35)} 100%)`
              : 'none',
            boxShadow: isLight ? `0 12px 40px ${alpha(colors.primary, 0.06)}` : 'none'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 20 }
        }
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 14,
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
              '&.Mui-focused': {
                boxShadow: `0 0 0 4px ${alpha(colors.primary, 0.12)}`
              }
            }
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(16px)',
            backgroundColor: isLight ? alpha('#ffffff', 0.88) : alpha('#121826', 0.9),
            borderBottom: `1px solid ${isLight ? alpha(colors.primary, 0.08) : alpha('#ffffff', 0.06)}`
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 10 },
          colorPrimary: {
            background: `linear-gradient(135deg, ${alpha(colors.primary, 0.14)} 0%, ${alpha(colors.accent, 0.12)} 100%)`,
            color: colors.primary
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 46,
            borderRadius: 14,
            fontWeight: 600,
            textTransform: 'none'
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 14, fontWeight: 500 }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 14 }
        }
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            transition: 'background-color 0.15s ease'
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 700,
              color: isLight ? colors.primary : '#E2E8F0',
              bgcolor: isLight ? alpha(colors.primary, 0.04) : alpha('#ffffff', 0.04)
            }
          }
        }
      }
    }
  }

  return createTheme(options)
}
