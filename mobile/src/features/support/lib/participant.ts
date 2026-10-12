import type { ChatMessage } from '@/features/messages/types/message.types'

import type { SupportParticipant } from '../types/support.types'

// Гость анонимен — отличаем по первым символам id, как на сайте
// (describeGuest).
export function describeParticipant(participant: SupportParticipant): string {
  return participant.type === 'guest'
    ? `Гость (${participant.id.slice(0, 8)})`
    : (participant.displayName ?? 'Пользователь')
}

// «Своё» для администратора — сообщение поддержки, то есть не от самого
// участника обращения: у гостя участник пишет только через senderGuestId,
// у вошедшего пользователя senderId равен его id.
export function isSupportSideMessage(participant: SupportParticipant, message: ChatMessage): boolean {
  return participant.type === 'guest' ? !message.senderGuestId : message.senderId !== participant.id
}
