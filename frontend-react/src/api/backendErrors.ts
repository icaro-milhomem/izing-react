export const backendErrors: Record<string, string> = {
  ERR_NO_DEF_WAPP_FOUND:
    'Nenhum WhatsApp padrão encontrado. Verifique a página de conexões.',
  ERR_WAPP_NOT_INITIALIZED:
    'Esta sessão do WhatsApp não foi inicializada. Verifique a página de conexões.',
  ERR_WAPP_INITIALIZED:
    'Não está conectado com o Whatsapp. Estamos reiniciando a conexão. Tente novamente em alguns segundos.',
  ERR_INVALID_CREDENTIALS: 'Erro de autenticação. Por favor, tente novamente.',
  ERR_SESSION_EXPIRED: 'Sessão expirada. Por favor entre.',
  ERR_NO_PERMISSION: 'Você não tem permissão para acessar este recurso.',
  ERR_COMPANY_NOT_ACTIVE: 'Não foi possivel fazer login empresa Inativa.',
  ERR_SETUP_ALREADY_DONE: 'A plataforma já foi configurada. Faça login com sua conta.',
  ERR_SETUP_TENANT_FAILED: 'Não foi possível criar a empresa. Tente novamente.',
  ERR_SETUP_EMAILS_MUST_DIFFER: 'O e-mail do Super e do Admin devem ser diferentes.',
  ERR_NO_PERMISSION_CONNECTIONS_LIMIT: 'Limite de conexões atingida.',
  ERR_SENDING_WAPP_MSG:
    'Mensagem não enviada pelo WhatsApp. Verifique se a conexão está ativa e tente novamente.'
}

export function resolveBackendError(error: unknown): string {
  const err = error as {
    response?: { data?: { error?: string } }
    message?: string
    code?: string
  }
  if (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK') {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3000.'
  }
  if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
    return 'A operação demorou mais que o esperado. Aguarde alguns segundos e verifique se o status do ticket foi atualizado.'
  }
  const code = err?.response?.data?.error
  if (code && backendErrors[code]) {
    return backendErrors[code]
  }
  if (code) return code
  return err?.message || 'Ocorreu um erro não identificado.'
}
