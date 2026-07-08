import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  MessagesSquare,
  MessageCircle,
  Contact,
  Radio,
  LayoutGrid,
  PieChart,
  Users,
  GitBranch,
  Zap,
  Bot,
  Workflow,
  Tags,
  Clock,
  Settings2,
  Megaphone,
  Webhook,
  Building2
} from 'lucide-react'

const MENU_ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  chat: MessagesSquare,
  'chat-internal': MessageCircle,
  contacts: Contact,
  channels: Radio,
  panel: LayoutGrid,
  reports: PieChart,
  users: Users,
  queues: GitBranch,
  fastreply: Zap,
  chatbot: Bot,
  'auto-reply': Workflow,
  tags: Tags,
  schedule: Clock,
  settings: Settings2,
  campaigns: Megaphone,
  api: Webhook,
  tenants: Building2
}

interface MenuLucideIconProps {
  name: string
  size?: number
  strokeWidth?: number
  className?: string
}

export function MenuLucideIcon({ name, size = 18, strokeWidth = 2, className }: MenuLucideIconProps) {
  const Icon = MENU_ICON_MAP[name] || LayoutDashboard
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />
}

export function getMenuLucideIcon(name: string): LucideIcon {
  return MENU_ICON_MAP[name] || LayoutDashboard
}
