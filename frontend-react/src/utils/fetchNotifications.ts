import { listTickets } from '@/api/tickets'
import { useNotificationStore } from '@/store/notificationStore'
import { buildNotificationParams } from '@/utils/notificationQuery'

export async function fetchNotificationTickets() {
  const { setOpenTickets, setPendingTickets } = useNotificationStore.getState()

  try {
    const { data } = await listTickets(buildNotificationParams(['open'], true))
    setOpenTickets(data.tickets, data.count)
  } catch {
    /* ignore */
  }

  try {
    const { data } = await listTickets(buildNotificationParams(['pending'], false))
    setPendingTickets(data.tickets, data.count)
  } catch {
    /* ignore */
  }
}
