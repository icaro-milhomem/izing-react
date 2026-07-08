import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute'
import { SetupGate } from '@/components/SetupGate'
import { ProfileDefaultRedirect } from '@/components/ProfileDefaultRedirect'
import { MainLayout } from '@/layouts/MainLayout'
import { AtendimentoLayout } from '@/layouts/AtendimentoLayout'
import { Error404Page } from '@/pages/Error404'
import { PageLoader } from '@/components/PageLoader'

const LoginPage = lazy(() => import('@/pages/Login').then(m => ({ default: m.LoginPage })))
const FirstAccessPage = lazy(() =>
  import('@/pages/FirstAccessPage').then(m => ({ default: m.FirstAccessPage }))
)
const DashboardPage = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.DashboardPage })))
const UsuariosSuperPage = lazy(() => import('@/pages/usuariossuper/UsuariosSuperPage').then(m => ({ default: m.UsuariosSuperPage })))
const SessoesSuperPage = lazy(() => import('@/pages/sessaosuper/SessoesSuperPage').then(m => ({ default: m.SessoesSuperPage })))
const AtendimentoPage = lazy(() => import('@/pages/atendimento/AtendimentoPage').then(m => ({ default: m.AtendimentoPage })))
const ContatosPage = lazy(() => import('@/pages/contatos/ContatosPage').then(m => ({ default: m.ContatosPage })))
const SessoesPage = lazy(() => import('@/pages/sessoes/SessoesPage').then(m => ({ default: m.SessoesPage })))
const FilasPage = lazy(() => import('@/pages/filas/FilasPage').then(m => ({ default: m.FilasPage })))
const EtiquetasPage = lazy(() => import('@/pages/etiquetas/EtiquetasPage').then(m => ({ default: m.EtiquetasPage })))
const MensagensRapidasPage = lazy(() => import('@/pages/mensagensRapidas/MensagensRapidasPage').then(m => ({ default: m.MensagensRapidasPage })))
const UsuariosPage = lazy(() => import('@/pages/usuarios/UsuariosPage').then(m => ({ default: m.UsuariosPage })))
const ConfiguracoesPage = lazy(() => import('@/pages/configuracoes/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })))
const EmpresasSuperPage = lazy(() => import('@/pages/empresassuper/EmpresasSuperPage').then(m => ({ default: m.EmpresasSuperPage })))
const ChatFlowPage = lazy(() => import('@/pages/chatFlow/ChatFlowPage').then(m => ({ default: m.ChatFlowPage })))
const FlowBuilderPage = lazy(() => import('@/pages/chatFlow/FlowBuilderPage').then(m => ({ default: m.FlowBuilderPage })))
const HorarioAtendimentoPage = lazy(() => import('@/pages/horarioAtendimento/HorarioAtendimentoPage').then(m => ({ default: m.HorarioAtendimentoPage })))
const CampanhasPage = lazy(() => import('@/pages/campanhas/CampanhasPage').then(m => ({ default: m.CampanhasPage })))
const CampanhaContatosPage = lazy(() => import('@/pages/campanhas/CampanhasPage').then(m => ({ default: m.CampanhaContatosPage })))
const AutoRespostaPage = lazy(() => import('@/pages/autoResposta/AutoRespostaPage').then(m => ({ default: m.AutoRespostaPage })))
const ApiServicePage = lazy(() => import('@/pages/api/ApiServicePage').then(m => ({ default: m.ApiServicePage })))
const ChatInternoPage = lazy(() => import('@/pages/chatInterno/ChatInternoPage').then(m => ({ default: m.ChatInternoPage })))
const PainelAtendimentosPage = lazy(() => import('@/pages/painel/PainelAtendimentosPage').then(m => ({ default: m.PainelAtendimentosPage })))
const RelatoriosPage = lazy(() => import('@/pages/relatorios/RelatoriosPage').then(m => ({ default: m.RelatoriosPage })))
const RelatorioContatosPage = lazy(() => import('@/pages/relatorios/RelatorioContatosPage').then(m => ({ default: m.RelatorioContatosPage })))
const RelatorioUsuariosPage = lazy(() => import('@/pages/relatorios/RelatorioGenericoPage').then(m => ({ default: m.RelatorioUsuariosPage })))
const RelatorioEtiquetasPage = lazy(() => import('@/pages/relatorios/RelatorioEtiquetasPage').then(m => ({ default: m.RelatorioEtiquetasPage })))
const RelatorioEstadoPage = lazy(() => import('@/pages/relatorios/RelatorioEtiquetasPage').then(m => ({ default: m.RelatorioEstadoPage })))
const RelatorioTicketsPage = lazy(() => import('@/pages/relatorios/RelatorioTicketsPage').then(m => ({ default: m.RelatorioTicketsPage })))

export default function App() {
  return (
    <HashRouter>
      <SetupGate>
        <Routes>
          <Route
            path="/primeiro-acesso"
            element={
              <Suspense fallback={<PageLoader />}>
                <FirstAccessPage />
              </Suspense>
            }
          />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AtendimentoLayout />}>
              <Route path="/atendimento" element={<AtendimentoPage />} />
              <Route path="/atendimento/contatos" element={<ContatosPage />} />
              <Route path="/atendimento/:ticketId" element={<AtendimentoPage />} />
            </Route>
            <Route path="/chat-flow/builder" element={<FlowBuilderPage />} />

            <Route element={<MainLayout />}>
              <Route path="/" element={<ProfileDefaultRedirect />} />
              <Route path="/home" element={<DashboardPage />} />
              <Route path="/contatos" element={<ContatosPage />} />
              <Route path="/sessoes" element={<SessoesPage />} />
              <Route path="/filas" element={<FilasPage />} />
              <Route path="/etiquetas" element={<EtiquetasPage />} />
              <Route path="/mensagens-rapidas" element={<MensagensRapidasPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              <Route path="/empresassuper" element={<EmpresasSuperPage />} />
              <Route path="/chat-interno" element={<ChatInternoPage />} />
              <Route path="/painel-atendimentos" element={<PainelAtendimentosPage />} />
              <Route path="/chat-flow" element={<ChatFlowPage />} />
              <Route path="/horario-atendimento" element={<HorarioAtendimentoPage />} />
              <Route path="/campanhas" element={<CampanhasPage />} />
              <Route path="/campanhas/:campanhaId" element={<CampanhaContatosPage />} />
              <Route path="/auto-resposta" element={<AutoRespostaPage />} />
              <Route path="/api-service" element={<ApiServicePage />} />
              <Route path="/relatorios" element={<RelatoriosPage />} />
              <Route path="/relatorios/lista-contatos" element={<RelatorioContatosPage />} />
              <Route path="/relatorios/estatisticas-atendimentos-usuarios" element={<RelatorioUsuariosPage />} />
              <Route path="/relatorios/contatos-por-etiquetas" element={<RelatorioEtiquetasPage />} />
              <Route path="/relatorios/contatos-por-estado" element={<RelatorioEstadoPage />} />
              <Route path="/relatorios/relatorio-tickets" element={<RelatorioTicketsPage />} />
              <Route path="/usuariossuper" element={<UsuariosSuperPage />} />
              <Route path="/sessaosuper" element={<SessoesSuperPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Error404Page />} />
        </Routes>
      </SetupGate>
    </HashRouter>
  )
}
