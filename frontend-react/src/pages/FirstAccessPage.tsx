import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme
} from '@mui/material'
import { Building2, Mail, Lock, Eye, EyeOff, User, ShieldCheck, Headphones } from 'lucide-react'
import { useBrandTokens } from '@/hooks/useBrandTokens'
import { useSnackbar } from 'notistack'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { DarkModeToggle } from '@/components/layout/DarkModeToggle'
import { getPostLoginPath, useAuthStore } from '@/store/authStore'
import { setupInitial, getSetupStatus, SETUP_STATUS_QUERY_KEY } from '@/api/setup'
import { resolveBackendError } from '@/api/backendErrors'
import { useAppTheme } from '@/providers/AppThemeProvider'
import { PageLoader } from '@/components/PageLoader'
import '@/pages/Login.css'

const schema = z
  .object({
    companyName: z.string().trim().min(2, 'Nome da empresa é obrigatório'),
    superName: z.string().trim().min(2, 'Nome do Super é obrigatório'),
    superEmail: z.string().trim().min(1, 'Email do Super é obrigatório').email('E-mail inválido'),
    superPassword: z.string().min(6, 'Senha do Super: mínimo 6 caracteres'),
    superConfirmPassword: z.string().min(1, 'Confirme a senha do Super'),
    adminName: z.string().trim().min(2, 'Nome do Admin é obrigatório'),
    adminEmail: z.string().trim().min(1, 'Email do Admin é obrigatório').email('E-mail inválido'),
    adminPassword: z.string().min(6, 'Senha do Admin: mínimo 6 caracteres'),
    adminConfirmPassword: z.string().min(1, 'Confirme a senha do Admin')
  })
  .refine(data => data.superPassword === data.superConfirmPassword, {
    message: 'As senhas do Super não coincidem',
    path: ['superConfirmPassword']
  })
  .refine(data => data.adminPassword === data.adminConfirmPassword, {
    message: 'As senhas do Admin não coincidem',
    path: ['adminConfirmPassword']
  })
  .refine(
    data => data.superEmail.trim().toLowerCase() !== data.adminEmail.trim().toLowerCase(),
    {
      message: 'Super e Admin devem ter e-mails diferentes',
      path: ['adminEmail']
    }
  )

type FormData = z.infer<typeof schema>

const features = [
  { icon: ShieldCheck, text: 'Super: gestão SaaS, empresas e usuários da plataforma' },
  { icon: Headphones, text: 'Admin: atendimento, chat e operação da empresa' },
  { icon: Building2, text: 'Empresa padrão criada automaticamente' }
]

function PasswordField({
  label,
  show,
  onToggle,
  error,
  helperText,
  registerProps
}: {
  label: string
  show: boolean
  onToggle: () => void
  error?: boolean
  helperText?: string
  registerProps: object
}) {
  const { colors } = useAppTheme()
  return (
    <TextField
      fullWidth
      label={label}
      type={show ? 'text' : 'password'}
      margin="normal"
      autoComplete="new-password"
      error={error}
      helperText={helperText}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Lock size={18} strokeWidth={2} color={colors.primary} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={onToggle} edge="end" aria-label={`Mostrar ${label}`}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </IconButton>
            </InputAdornment>
          )
        }
      }}
      {...registerProps}
    />
  )
}

export function FirstAccessPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const applySession = useAuthStore(s => s.applySession)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { brand } = useBrandTokens()
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const { colors } = useAppTheme()
  const [showSuperPassword, setShowSuperPassword] = useState(false)
  const [showSuperConfirm, setShowSuperConfirm] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showAdminConfirm, setShowAdminConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const { data: setupStatus, isLoading: checkingSetup } = useQuery({
    queryKey: SETUP_STATUS_QUERY_KEY,
    queryFn: async () => (await getSetupStatus()).data,
    staleTime: 0
  })

  useEffect(() => {
    if (setupStatus?.initialized) {
      if (isAuthenticated) {
        const profile = localStorage.getItem('profile')
        navigate(getPostLoginPath(profile), { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [setupStatus?.initialized, isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (setupStatus?.initialized || completed) {
      setError('A plataforma já foi configurada. Faça login com sua conta.')
      return
    }

    setError(null)
    try {
      const { data: session } = await setupInitial({
        companyName: data.companyName,
        superUser: {
          name: data.superName,
          email: data.superEmail,
          password: data.superPassword
        },
        adminUser: {
          name: data.adminName,
          email: data.adminEmail,
          password: data.adminPassword
        }
      })

      setCompleted(true)
      queryClient.setQueryData(SETUP_STATUS_QUERY_KEY, { initialized: true })

      const user = applySession(session)
      enqueueSnackbar('Plataforma configurada! Entrando como Super…', { variant: 'success' })
      navigate(getPostLoginPath(user.profile), { replace: true })
    } catch (err) {
      const message = resolveBackendError(err)
      setError(message)
      enqueueSnackbar(message, { variant: 'error' })
      await queryClient.invalidateQueries({ queryKey: SETUP_STATUS_QUERY_KEY })
    }
  }

  if (checkingSetup || setupStatus?.initialized) {
    return <PageLoader />
  }

  return (
    <Box className="login-page" sx={{ bgcolor: 'background.default' }}>
      <Box className="login-bg" sx={{ background: brand.gradient }}>
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
              Primeiro acesso
            </Typography>
            <Typography sx={{ opacity: 0.88, maxWidth: 360, lineHeight: 1.7 }}>
              Configure a empresa, o Super (SaaS) e o Admin (atendimento) em um único passo.
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
                )
              })}
            </Stack>
          </Box>
        </Paper>

        <Paper
          className="login-card"
          elevation={0}
          sx={{
            bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.92)' : 'rgba(23,27,36,0.92)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${theme.palette.divider}`,
            maxHeight: { xs: 'none', md: '92vh' },
            overflowY: 'auto'
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
            Configuração inicial
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Após concluir, você entrará como <strong>Super</strong> (painel SaaS).
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>
              Empresa
            </Typography>
            <TextField
              fullWidth
              label="Nome da empresa"
              margin="normal"
              error={Boolean(errors.companyName)}
              helperText={errors.companyName?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Building2 size={18} strokeWidth={2} color={colors.primary} />
                    </InputAdornment>
                  )
                }
              }}
              {...register('companyName')}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Super — plataforma SaaS
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Gerencia empresas, usuários globais e configurações da plataforma.
            </Typography>

            <TextField
              fullWidth
              label="Nome do Super"
              margin="normal"
              error={Boolean(errors.superName)}
              helperText={errors.superName?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <ShieldCheck size={18} strokeWidth={2} color={colors.primary} />
                    </InputAdornment>
                  )
                }
              }}
              {...register('superName')}
            />

            <TextField
              fullWidth
              label="Email do Super"
              margin="normal"
              autoComplete="email"
              error={Boolean(errors.superEmail)}
              helperText={errors.superEmail?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} strokeWidth={2} color={colors.primary} />
                    </InputAdornment>
                  )
                }
              }}
              {...register('superEmail')}
            />

            <PasswordField
              label="Senha do Super"
              show={showSuperPassword}
              onToggle={() => setShowSuperPassword(v => !v)}
              error={Boolean(errors.superPassword)}
              helperText={errors.superPassword?.message}
              registerProps={register('superPassword')}
            />

            <PasswordField
              label="Confirmar senha do Super"
              show={showSuperConfirm}
              onToggle={() => setShowSuperConfirm(v => !v)}
              error={Boolean(errors.superConfirmPassword)}
              helperText={errors.superConfirmPassword?.message}
              registerProps={register('superConfirmPassword')}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Admin — atendimento da empresa
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Opera o chat, filas, contatos e demais funções do dia a dia.
            </Typography>

            <TextField
              fullWidth
              label="Nome do Admin"
              margin="normal"
              error={Boolean(errors.adminName)}
              helperText={errors.adminName?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <User size={18} strokeWidth={2} color={colors.primary} />
                    </InputAdornment>
                  )
                }
              }}
              {...register('adminName')}
            />

            <TextField
              fullWidth
              label="Email do Admin"
              margin="normal"
              autoComplete="email"
              error={Boolean(errors.adminEmail)}
              helperText={errors.adminEmail?.message}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Mail size={18} strokeWidth={2} color={colors.primary} />
                    </InputAdornment>
                  )
                }
              }}
              {...register('adminEmail')}
            />

            <PasswordField
              label="Senha do Admin"
              show={showAdminPassword}
              onToggle={() => setShowAdminPassword(v => !v)}
              error={Boolean(errors.adminPassword)}
              helperText={errors.adminPassword?.message}
              registerProps={register('adminPassword')}
            />

            <PasswordField
              label="Confirmar senha do Admin"
              show={showAdminConfirm}
              onToggle={() => setShowAdminConfirm(v => !v)}
              error={Boolean(errors.adminConfirmPassword)}
              helperText={errors.adminConfirmPassword?.message}
              registerProps={register('adminConfirmPassword')}
            />

            <Button
              type="submit"
              fullWidth
              size="large"
              variant="contained"
              disabled={isSubmitting || completed || Boolean(setupStatus?.initialized)}
              sx={{ mt: 3, py: 1.4, borderRadius: 999, fontSize: '1rem' }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Criar empresa e entrar como Super'
              )}
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
            O Admin poderá fazer login depois com o e-mail cadastrado acima.
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
