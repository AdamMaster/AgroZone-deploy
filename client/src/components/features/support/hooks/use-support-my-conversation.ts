'use client'

import { useQuery } from '@tanstack/react-query'

import { supportService } from '../services/support.service'

// enabled приходит снаружи (см. SupportChatWidget/SupportParticipantChat) —
// этот запрос сам по себе безобиден для залогиненного юзера, но для
// анонимного гостя заводит запись SupportGuest в базе и cookie сессии при
// первом же вызове (см. SupportIdentityGuard на бэкенде) — дёргать его
// можно только когда участник реально открыл виджет, не молча в фоне на
// каждой странице.
//
// isReady (query.isSuccess) — отдельно от isLoading: это сигнал "гостевая
// identity в cookie сессии точно есть", которым SupportChatWidget гейтит
// подключение сокета для гостя (см. комментарий там же про гонку
// REST/WS — без этого гейта хэндшейк socket.io мог прийти раньше, чем
// браузер успел применить Set-Cookie из ответа на этот же запрос).
export function useSupportMyConversation(enabled: boolean) {
  const query = useQuery({
    queryKey: ['support-my-conversation'],
    queryFn: () => supportService.getMyConversation(),
    enabled
  })

  return {
    conversation: query.data ?? null,
    isLoading: query.isLoading,
    isReady: query.isSuccess
  }
}
