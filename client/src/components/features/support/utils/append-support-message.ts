import { ISupportMessage } from '../types/support.types'

// Одно и то же сообщение может прийти в кэш дважды: один раз из onSuccess
// собственной отправки (см. use-send-support-my-message.ts /
// use-send-support-admin-message.ts — дописываем сразу, не дожидаясь
// сокета), второй раз — эхом по сокету, потому что комната участника (см.
// SupportGateway.participantRoom) рассылает сообщение ВСЕМ вкладкам этого
// же участника, включая ту, что его только что отправила. Дедуп по id —
// самый простой способ не дать сообщению задвоиться в списке.
export function appendSupportMessage(old: ISupportMessage[] | undefined, message: ISupportMessage): ISupportMessage[] {
  if (!old) return [message]
  if (old.some(existing => existing.id === message.id)) return old

  return [...old, message]
}
