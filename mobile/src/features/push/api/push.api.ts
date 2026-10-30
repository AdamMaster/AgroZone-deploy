import { apiClient } from '@/lib/api/api-client'

// Совпадает с enum PushProvider на сервере.
export type PushProvider = 'RUSTORE' | 'FCM'

export const pushApi = {
  // installationId — идентификатор установки: по нему сервер оставляет на
  // телефоне один канал (токен другого провайдера этой установки удаляется).
  register: (provider: PushProvider, token: string, appVersion?: string, installationId?: string) =>
    apiClient.post<void>('/push-devices', { provider, token, appVersion, installationId }, { expectBody: false }),

  unregister: (provider: PushProvider, token: string) =>
    apiClient.post<void>('/push-devices/unregister', { provider, token }, { expectBody: false })
}
