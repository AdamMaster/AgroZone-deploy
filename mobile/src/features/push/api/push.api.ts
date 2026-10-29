import { apiClient } from '@/lib/api/api-client'

// Совпадает с enum PushProvider на сервере.
export type PushProvider = 'RUSTORE'

export const pushApi = {
  register: (provider: PushProvider, token: string, appVersion?: string) =>
    apiClient.post<void>('/push-devices', { provider, token, appVersion }, { expectBody: false }),

  unregister: (provider: PushProvider, token: string) =>
    apiClient.post<void>('/push-devices/unregister', { provider, token }, { expectBody: false })
}
