import { create } from 'zustand'

export interface OnlineUserBubble {
  id: number
  name?: string
  email?: string
  status?: 'online' | 'offline'
  isOnline?: boolean
}

interface UsersAppState {
  usersApp: OnlineUserBubble[]
  setUsersApp: (users: OnlineUserBubble[]) => void
  patchUserStatus: (email: string, status: 'online' | 'offline') => void
}

export const useUsersAppStore = create<UsersAppState>(set => ({
  usersApp: [],
  setUsersApp: users => set({ usersApp: Array.isArray(users) ? users : [] }),
  patchUserStatus: (email, status) =>
    set(state => {
      if (!Array.isArray(state.usersApp)) return { usersApp: [] }
      return {
        usersApp: state.usersApp.map(u => (u.email === email ? { ...u, status } : u))
      }
    })
}))

export function mergeUserOnlineStatus<T extends { id: number; email?: string; status?: string }>(
  users: T[],
  onlineBubbles: OnlineUserBubble[]
): T[] {
  if (!onlineBubbles.length) return users

  return users.map(user => {
    const bubble =
      onlineBubbles.find(b => b.id === user.id) ||
      (user.email ? onlineBubbles.find(b => b.email === user.email) : undefined)
    if (!bubble) return user

    const status =
      bubble.status ||
      (bubble.isOnline ? 'online' : 'offline') ||
      user.status

    return { ...user, status }
  })
}
