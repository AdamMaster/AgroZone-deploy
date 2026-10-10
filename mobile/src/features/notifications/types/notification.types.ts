// Уведомление — ответ GET /notifications. Тип на сервере расширяемый
// (NotificationType в schema.prisma), поэтому интерфейс показывает
// title/message/link как есть, без разбора по типу — новый тип не требует
// изменений в приложении.
export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  // Путь страницы сайта, к которой относится уведомление (например,
  // /ads/{id}/edit для отклонённого объявления).
  link: string | null
  isRead: boolean
  createdAt: string
}
