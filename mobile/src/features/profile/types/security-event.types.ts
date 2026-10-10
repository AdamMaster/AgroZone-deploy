// Запись журнала безопасности в том виде, в каком её видит сам владелец
// аккаунта (SecurityEventForUser на сервере). Тип события — строка: сервер
// может знать типы, которых ещё не знает эта версия приложения, и такая
// запись всё равно показывается (с нейтральной подписью).
export interface SecurityEvent {
  id: string
  type: string
  actor: 'USER' | 'ADMIN' | 'SYSTEM'
  ip: string | null
  device: string | null
  // Плоские значения; контакты (почта, телефон) сервер уже маскирует.
  metadata: Record<string, string | number | boolean | null> | null
  createdAt: string
}

export interface SecurityEventsPage {
  items: SecurityEvent[]
  total: number
  page: number
  limit: number
}
