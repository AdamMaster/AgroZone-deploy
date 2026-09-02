import { api } from '@/shared/api'

import { IFindNotificationsParams, INotification, IUnreadNotificationsCount } from '../types/notification.types'

class NotificationsService {
  private URL = 'notifications'

  async findMy(params?: IFindNotificationsParams): Promise<INotification[]> {
    return api.get<INotification[]>(this.URL, { params })
  }

  async countUnread(): Promise<IUnreadNotificationsCount> {
    return api.get<IUnreadNotificationsCount>(`${this.URL}/unread-count`)
  }

  async markAsRead(id: string): Promise<INotification> {
    return api.patch<INotification>(`${this.URL}/${id}/read`)
  }

  async markAllAsRead(): Promise<{ success: boolean }> {
    return api.patch<{ success: boolean }>(`${this.URL}/read-all`)
  }
}

export const notificationsService = new NotificationsService()
