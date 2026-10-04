'use client'

import { securityEventsService } from '../services'
import { IAdminSecurityEvent, SecurityEventType } from '../types/security-event.types'
import { useSecurityEventsInfinite } from './use-security-events-infinite'

const PAGE_SIZE = 20

// Ключ кэша начинается с 'admin-user-security-events' + userId — админские
// мутации (смена пароля/email, premium) инвалидируют журнал по этому
// префиксу сразу для всех фильтров (см. use-set-password-by-admin и т.д.).
export const adminUserSecurityEventsKey = (userId: string) => ['admin-user-security-events', userId] as const

// Журнал событий безопасности на карточке пользователя в админке
// (/admin/users/:id) — см. SecurityEventsService.findForAdmin на бэкенде.
export function useAdminUserSecurityEvents(userId: string, types?: SecurityEventType[]) {
  return useSecurityEventsInfinite<IAdminSecurityEvent>({
    queryKey: [...adminUserSecurityEventsKey(userId), types?.join(',') ?? 'all'],
    fetchPage: page => securityEventsService.findByUserForAdmin(userId, { page, limit: PAGE_SIZE, types }),
    enabled: Boolean(userId)
  })
}
