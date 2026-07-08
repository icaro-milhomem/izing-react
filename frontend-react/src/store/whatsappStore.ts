import { create } from 'zustand'
import type { WhatsappSession } from '@/types/entities'

interface WhatsappState {
  sessions: WhatsappSession[]
  setSessions: (sessions: WhatsappSession[]) => void
  updateSession: (session: WhatsappSession) => void
  deleteSession: (id: number) => void
}

export const useWhatsappStore = create<WhatsappState>(set => ({
  sessions: [],
  setSessions: sessions => set({ sessions }),
  updateSession: session =>
    set(state => {
      const idx = state.sessions.findIndex(s => s.id === session.id)
      if (idx === -1) return { sessions: [...state.sessions, session] }
      const next = [...state.sessions]
      next[idx] = session
      return { sessions: next }
    }),
  deleteSession: id => set(state => ({ sessions: state.sessions.filter(s => s.id !== id) }))
}))
