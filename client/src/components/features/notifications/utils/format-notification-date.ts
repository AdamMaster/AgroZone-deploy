// Общий формат даты для уведомления — используется и в дропдауне
// колокольчика (NotificationBell), и на отдельной странице со всеми
// уведомлениями (ContentNotifications), поэтому вынесено сюда, а не
// продублировано в обоих местах.
export const formatNotificationDate = (value: string) => {
  const date = new Date(value)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)
}
