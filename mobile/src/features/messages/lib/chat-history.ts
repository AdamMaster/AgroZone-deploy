import type { ChatHistory, ChatMessage } from '../types/message.types'

// Сколько сообщений грузится за раз — и последних, и при прокрутке к
// старым (как у сайта).
export const CHAT_PAGE_SIZE = 30

// Свежая страница последних сообщений поверх уже загруженной истории.
// Неполная страница — это вся переписка целиком: берём её как есть (так
// пропадают и сообщения, удалённые модератором поддержки). Полная —
// сохраняем подгруженные раньше сообщения старше неё.
export function mergeLatestPage(current: ChatHistory | undefined, latest: ChatMessage[]): ChatHistory {
  if (latest.length < CHAT_PAGE_SIZE) return { messages: latest, hasOlder: false }

  const oldestLatest = latest[0].createdAt
  const older = current?.messages.filter(message => message.createdAt < oldestLatest) ?? []

  // Старые сообщения уже подгружены — что за ними, известно из прошлой
  // подгрузки; нет — полная страница значит, что история может быть длиннее.
  return { messages: [...older, ...latest], hasOlder: current && older.length > 0 ? current.hasOlder : true }
}

// Подгруженные старые сообщения — в начало истории.
export function prependOlderPage(current: ChatHistory | undefined, older: ChatMessage[]): ChatHistory {
  const messages = current?.messages ?? []
  const known = new Set(messages.map(message => message.id))

  return {
    messages: [...older.filter(message => !known.has(message.id)), ...messages],
    hasOlder: older.length === CHAT_PAGE_SIZE
  }
}

// Новое сообщение (своё отправленное или пришедшее по сокету) — в конец.
// Одно и то же может прийти дважды (ответ на отправку и эхо сокета).
export function appendMessage(current: ChatHistory | undefined, message: ChatMessage): ChatHistory {
  if (!current) return { messages: [message], hasOlder: false }
  if (current.messages.some(existing => existing.id === message.id)) return current

  return { ...current, messages: [...current.messages, message] }
}

export function removeMessage(current: ChatHistory | undefined, messageId: string): ChatHistory | undefined {
  if (!current) return current

  return { ...current, messages: current.messages.filter(message => message.id !== messageId) }
}
