export function buildNotificationParams(status: string[], withUnreadMessages: boolean) {
  const userQueues = JSON.parse(localStorage.getItem('queues') || '[]') as Array<{ id: number }>
  const params: Record<string, unknown> = {
    searchParam: '',
    pageNumber: 1,
    status,
    showAll: false,
    count: null,
    withUnreadMessages,
    isNotAssignedUser: false,
    includeNotQueueDefined: true
  }
  if (userQueues.length) {
    params.queuesIds = userQueues.map(q => q.id)
  }
  return params
}
