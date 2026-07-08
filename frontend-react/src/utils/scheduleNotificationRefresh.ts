let notificationRefreshTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleNotificationRefresh(run: () => void, delayMs = 1500) {
  if (notificationRefreshTimer) {
    clearTimeout(notificationRefreshTimer)
  }
  notificationRefreshTimer = setTimeout(() => {
    notificationRefreshTimer = null
    run()
  }, delayMs)
}
