import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme
} from '@mui/material'
import { Mail, Lock, Eye, EyeOff, MessagesSquare, Zap, ShieldCheck } from 'lucide-react'
import { useBrandTokens } from '@/hooks/useBrandTokens'
import { useSnackbar } from 'notistack'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { DarkModeToggle } from '@/components/layout/DarkModeToggle'
import { getPostLoginPath, useAuthStore } from '@/store/authStore'
import { resolveBackendError } from '@/api/backendErrors'
import { useAppTheme } from '@/providers/AppThemeProvider'
import './Login.css'

const schema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Deve ser um e-mail válido'),
  password: z.string().min(1, 'Senha é obrigatória')
})

type FormData = z.infer<typeof schema>

const features = [
  { icon: MessagesSquare, text: 'Atendimento multicanal em tempo real' },
  { icon: Zap, text: 'Automação com chatbot e campanhas' },
  { icon: ShieldCheck, text: 'Gestão segura de equipes e filas' }
]

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const { brand } = useBrandTokens()
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const { colors } = useAppTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const user = await login(data)
      enqueueSnackbar('Login realizado com sucesso!', { variant: 'success' })
      navigate(getPostLoginPath(user.profile), { replace: true })
    } catch (err) {
      const message = resolveBackendError(err)
      setError(message)
      enqueueSnackbar(message, { variant: 'error' })
    }
  }

  return (
    <Box className="login-page" sx={{ bgcolor: 'background.default' }}>
      <Box
        className="login-bg"
        sx={{
          background: brand.gradient
        }}
      >
        <Box className="orb orb-1" />
        <Box className="orb orb-2" />
        <Box className="orb orb-3" />
        <Box className="login-grid" />
      </Box>

      <Box className="login-shell">
        <Paper
          className="login-brand-panel"
          elevation={0}
          sx={{
            display: { xs: 'none', md: 'flex' },
            color: '#fff',
            background: brand.gradient,
            border: '1px solid rgba(255,255,255,0.14)'
          }}
        >
          <Box>
            <BrandLogo size="lg" variant="onDark" />
            <Typography variant="h4" sx={{ mt: 4, mb: 1.5, fontWeight: 800, color: '#fff' }}>
              Plataforma de atendimento inteligente
            </Typography>
            <Typography sx={{ opacity: 0.88, maxWidth: 360, lineHeight: 1.7 }}>
              Centralize WhatsApp, equipes e automações em um só lugar com visual moderno e produtivo.
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 4 }}>
              {features.map(item => {
                const FeatureIcon = item.icon
                return (
                <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 3,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.14)'
                    }}
                  >
                    <FeatureIcon size={18} strokeWidth={2.25} color="#fff" />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {item.text}
                  </Typography>
                </Box>
              )})}
            </Stack>
          </Box>
        </Paper>

        <Paper
          className="login-card"
          elevation={0}
          sx={{
            bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(23,27,36,0.92)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <BrandLogo size="md" />
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <DarkModeToggle dense />
            </Box>
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Bem-vindo
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Entre com suas credenciais para continuar
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              fullWidth
              label="Email"
              margin="normal"
              autoComplete="email"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} strokeWidth={2} color={colors.primary} />
                    </InputAdornment>
                  )
                }
              }}
              {...register('email')}
            />

            <TextField
              fullWidth
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              autoComplete="current-password"
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock size={18} strokeWidth={2} color={colors.primary} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(v => !v)} edge="end" aria-label="Mostrar senha">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
              {...register('password')}
            />

            <Button
              type="submit"
              fullWidth
              size="large"
              variant="contained"
              disabled={isSubmitting}
              sx={{ mt: 3, py: 1.4, borderRadius: 999, fontSize: '1rem' }}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Entrar na plataforma'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
            IZING · Atendimento multicanal
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
