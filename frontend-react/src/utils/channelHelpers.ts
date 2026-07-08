import { resolveMediaUrl } from '@/utils/mediaUrl'

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  waba: 'WhatsApp Business',
  telegram: 'Telegram',
  instagram: 'Instagram',
  messenger: 'Messenger',
  hub: 'Hub',
  hub_facebook: 'Facebook',
  hub_instagram: 'Instagram'
}

export function getChannelLabel(channel?: string | null, whatsappName?: string | null): string {
  if (whatsappName?.trim()) return whatsappName.trim()
  if (!channel) return 'Canal'
  return CHANNEL_LABELS[channel] || channel
}

export function getChannelLogoSrc(channel?: string | null, customLogo?: string | null): string | undefined {
  const logo = customLogo?.trim()
  if (logo) return resolveMediaUrl(logo) || logo
  if (!channel) return '/whatsapp-logo.png'
  return `/${channel}-logo.png`
}
