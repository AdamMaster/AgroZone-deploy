// Что отправляем на устройство. link — адрес, который откроется по нажатию
// (в приложении — deep link вида agrozone://chat/{id}).
export interface PushNotificationPayload {
  title: string
  body: string
  link?: string
  data?: Record<string, string>
}

// Итог отправки на один токен. invalid-token — токен больше не действует
// (приложение удалено, токен сменился): такое устройство забываем.
export type PushSendResult = 'sent' | 'invalid-token' | 'failed' | 'skipped'
