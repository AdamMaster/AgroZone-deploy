import { api } from '@/shared/api'

import {
  IAdminSecurityEvent,
  IFindSecurityEventsParams,
  ISecurityEvent,
  ISecurityEventsPage
} from '../types/security-event.types'

class SecurityEventsService {
  // Журнал события безопасности конкретного пользователя для его карточки
  // в админке — см. UserController.findSecurityEventsByAdmin на бэкенде.
  async findByUserForAdmin(
    userId: string,
    params?: IFindSecurityEventsParams
  ): Promise<ISecurityEventsPage<IAdminSecurityEvent>> {
    return api.get<ISecurityEventsPage<IAdminSecurityEvent>>(`users/admin/${userId}/security-events`, { params })
  }

  // Собственный журнал пользователя ("Недавняя активность" в настройках
  // безопасности) — см. UserController.findMySecurityEvents.
  async findMy(params?: IFindSecurityEventsParams): Promise<ISecurityEventsPage<ISecurityEvent>> {
    return api.get<ISecurityEventsPage<ISecurityEvent>>('users/profile/security-events', { params })
  }
}

export const securityEventsService = new SecurityEventsService()
