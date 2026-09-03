import { ISupportMessage } from '../types/support.types'

// Обратная пара к appendSupportMessage — так же может прийти дважды: один
// раз сразу из onSuccess мутации удаления (см.
// use-delete-support-admin-message.ts — убираем из кэша не дожидаясь
// сокета), второй раз эхом по сокету ('support:message-deleted', см.
// use-support-realtime.ts). filter по id идемпотентен: повторное удаление
// уже отсутствующего id — no-op, а не ошибка.
export function removeSupportMessage(old: ISupportMessage[] | undefined, messageId: string): ISupportMessage[] | undefined {
  if (!old) return old
  return old.filter(message => message.id !== messageId)
}
