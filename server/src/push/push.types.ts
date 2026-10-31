// Канал уведомлений Android: у каждого свои настройки звука и важности, и
// человек отключает их независимо («Сообщения» отдельно от «События»).
export type PushChannel = 'messages' | 'events'

// Что отправляем на устройство. link — адрес, который откроется по нажатию
// (в приложении — deep link вида agrozone://chat/{id}). channel не задан —
// «Сообщения» (так же ведут себя сборки приложения, не знающие про каналы).
export interface PushNotificationPayload {
  title: string
  body: string
  link?: string
  channel?: PushChannel
  data?: Record<string, string>
}

// Итог отправки на один токен. invalid-token — токен больше не действует
// (приложение удалено, токен сменился): такое устройство забываем.
export type PushSendResult = 'sent' | 'invalid-token' | 'failed' | 'skipped'

export interface SendToUserOptions {
  // Не первое сообщение серии: получателя уже оповестили, а новое должно лишь
  // обновить текст в том же уведомлении. Уходит только тем каналам, которые
  // умеют заменять уведомление (см. PUSH_REPLACEABLE_PROVIDERS); остальные
  // (RuStore показывает уведомление сам) не получают — иначе они копили бы
  // отдельное уведомление на каждое сообщение.
  followUp?: boolean
}
