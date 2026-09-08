// Enum на бэкенде расширяемый (см. NotificationType в schema.prisma), тип
// здесь зеркалит это же намерение. Компоненты рендерят title/message/link
// полностью generic, без switch по типу — новое значение добавляется сюда
// без изменений в компонентах.
export type NotificationType = 'AD_REJECTED' | 'NEW_MESSAGE'

export interface INotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: string
}

export interface IFindNotificationsParams {
  page?: number
  limit?: number
  isRead?: boolean
  // Индекс-сигнатура нужна, чтобы TS принял этот интерфейс там, где
  // ожидается TypeSearchParams (see src/shared/fetch/fetch-types.ts) — без
  // неё интерфейс с конкретными полями не считается совместимым с
  // индексируемым типом, даже если типы полей совпадают.
  [key: string]: string | number | boolean | undefined
}

export interface IUnreadNotificationsCount {
  count: number
}
