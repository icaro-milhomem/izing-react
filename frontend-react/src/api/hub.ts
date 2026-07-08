import { api } from './client'

export function isHubChannel(channel?: string | null) {
  return Boolean(channel?.includes('hub'))
}

export interface HubChannelOption {
  id: string
  name: string
  channel: string
  profile_pic?: string
  [key: string]: unknown
}

export const listHubChannels = () => api.get<HubChannelOption[]>('/hub-channel/')

export const createHubChannels = (channels: Record<string, unknown>[]) =>
  api.post('/hub-channel/', { channels })

export const sendHubMessage = (ticketId: number, data: Record<string, unknown> | FormData) =>
  api.post(`/hub-message/${ticketId}`, data, {
    timeout: data instanceof FormData ? 120000 : 60000
  })

export function buildHubChannelPayload(name: string, hub: HubChannelOption) {
  return {
    name,
    status: 'CONNECTED',
    isDefault: false,
    type: `hub_${hub.channel}`,
    number: hub.id,
    profilePic: hub.profile_pic,
    phone: hub
  }
}
