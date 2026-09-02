import { api } from '@/shared/api'

class EmailChangeService {
  async request(body: { newEmail: string; password?: string }, recaptcha?: string) {
    const headers = recaptcha ? { recaptcha } : undefined

    const response = await api.post<boolean>('auth/email-change', body, { headers })
    return response
  }

  async confirm(token: string | null) {
    const response = await api.post<boolean>(`auth/email-change/confirm?token=${token}`)
    return response
  }
}

export const emailChangeService = new EmailChangeService()
