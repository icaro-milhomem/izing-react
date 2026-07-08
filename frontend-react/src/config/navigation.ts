import type { MenuItem } from '@/types/auth'

export const baseMenu: MenuItem[] = [
  { title: 'Dashboard', caption: 'Visão geral', path: '/home', icon: 'dashboard' },
  { title: 'Atendimentos', caption: 'Lista de atendimentos', path: '/atendimento', icon: 'chat' },
  { title: 'Chat Interno', caption: 'Comunicação entre atendentes', path: '/chat-interno', icon: 'chat-internal' },
  { title: 'Contatos', caption: 'Lista de contatos', path: '/contatos', icon: 'contacts' }
]

export const adminMenu: MenuItem[] = [
  { title: 'Canais', caption: 'Conexões WhatsApp', path: '/sessoes', icon: 'channels' },
  { title: 'Painel Atendimentos', caption: 'Visão geral dos atendimentos', path: '/painel-atendimentos', icon: 'panel' },
  { title: 'Relatórios', caption: 'Relatórios gerais', path: '/relatorios', icon: 'reports' },
  { title: 'Usuários', caption: 'Admin de usuários', path: '/usuarios', icon: 'users' },
  { title: 'Filas', caption: 'Cadastro de filas', path: '/filas', icon: 'queues' },
  { title: 'Mensagens Rápidas', caption: 'Mensagens pré-definidas', path: '/mensagens-rapidas', icon: 'fastreply' },
  { title: 'Chatbot', caption: 'Robô de atendimento', path: '/chat-flow', icon: 'chatbot' },
  { title: 'Auto Resposta', caption: 'Fluxos automáticos', path: '/auto-resposta', icon: 'auto-reply' },
  { title: 'Etiquetas', caption: 'Cadastro de etiquetas', path: '/etiquetas', icon: 'tags' },
  { title: 'Horário de Atendimento', caption: 'Horário de funcionamento', path: '/horario-atendimento', icon: 'schedule' },
  { title: 'Configurações', caption: 'Configurações gerais', path: '/configuracoes', icon: 'settings' },
  { title: 'Campanhas', caption: 'Campanhas de envio', path: '/campanhas', icon: 'campaigns' },
  { title: 'API', caption: 'Integração externa', path: '/api-service', icon: 'api' }
]

export const superMenu: MenuItem[] = [
  { title: 'Empresas', caption: 'Admin das empresas', path: '/empresassuper', icon: 'tenants' },
  { title: 'Usuários', caption: 'Admin de usuários', path: '/usuariossuper', icon: 'users' },
  { title: 'Canais', caption: 'Canais de comunicação', path: '/sessaosuper', icon: 'channels' },
  { title: 'Chat Interno', caption: 'Comunicação entre atendentes', path: '/chat-interno', icon: 'chat-internal' }
]

export function getMenuForProfile(profile: string | null): MenuItem[] {
  const normalized = (profile || '').trim().toLowerCase()
  if (normalized === 'super') return superMenu
  if (normalized === 'admin') return [...baseMenu, ...adminMenu]
  if (normalized === 'user') return baseMenu
  return baseMenu
}
