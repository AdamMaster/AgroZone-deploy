'use client'

import { securityEventsService } from '../services'
import { ISecurityEvent, SecurityEventType } from '../types/security-event.types'
import { useSecurityEventsInfinite } from './use-security-events-infinite'

const PAGE_SIZE = 10

// Префикс ключа кэша — чтобы мутации в настройках безопасности (смена
// пароля, 2FA, телефон) могли обновить журнал сразу для всех фильтров.
export const MY_SECURITY_EVENTS_KEY = ['my-security-events'] as const

// Собственный журнал событий безопасности пользователя ("Недавняя
// активность" в настройках) — см. UserController.findMySecurityEvents.
export function useMySecurityEvents(types?: SecurityEventType[]) {
  return useSecurityEventsInfinite<ISecurityEvent>({
    queryKey: [...MY_SECURITY_EVENTS_KEY, types?.join(',') ?? 'all'],
    fetchPage: page => securityEventsService.findMy({ page, limit: PAGE_SIZE, types })
  })
}
