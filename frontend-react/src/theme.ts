import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea'
    },
    secondary: {
      main: '#764ba2'
    },
    background: {
      default: '#f5f7fb'
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
  }
})
