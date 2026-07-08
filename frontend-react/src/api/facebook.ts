import { api } from './client'
import type { WhatsappSession } from '@/types/entities'

export const registerFacebookPages = (data: {
  whatsapp: Pick<WhatsappSession, 'id'> | WhatsappSession
  accountId: string
  userToken: string
}) => api.post('/fb/register-pages', data)

export const logoutFacebookPages = (whatsapp: Pick<WhatsappSession, 'id'> | WhatsappSession) =>
  api.post('/fb/logout-pages', whatsapp)
