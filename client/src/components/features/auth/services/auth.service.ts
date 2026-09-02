import { api } from '@/shared/api'

import { TypeLoginSchema, TypeRegisterSchema, TypeRegisterSmsFinalSchema } from '../schemes'
import { IUser } from '../types'

class AuthService {
  async registerSmsStart(body: { phone: string }, recaptcha?: string | null) {
    const headers = recaptcha ? { recaptcha } : undefined

    const response = await api.post<{ message: string; callNumber: string }>('auth/register/sms/start', body, {
      headers
    })

    return response
  }

  // Опрос, пока пользователь не позвонит на выданный номер (см.
  // AuthController.checkSmsCallbackStatus). confirmed=false, пока звонка
  // не было — это не ошибка, а нормальное промежуточное состояние.
  async checkSmsCallbackStatus(phone: string) {
    const response = await api.post<{ confirmed: boolean; code?: string }>('auth/register/sms/status', { phone })
    return response
  }

  async checkRegisterCode(data: { phone: string; code: string }) {
    const response = await api.post<{ success: boolean }>('auth/register/check-code', data)
    return response
  }

  async registerSmsComplete(body: TypeRegisterSmsFinalSchema) {
    const response = await api.post<IUser>('auth/register/sms/complete', body)

    return response
  }

  async register(body: TypeRegisterSchema, recaptcha?: string) {
    const headers = recaptcha ? { recaptcha } : undefined

    const response = await api.post<IUser>('auth/register', body, { headers })

    return response
  }

  async login(body: TypeLoginSchema, recaptcha?: string) {
    const headers = recaptcha ? { recaptcha } : undefined

    const response = await api.post<IUser & { message?: string }>('auth/login', body, { headers })

    return response
  }

  async oauthByProvider(provider: 'google' | 'yandex') {
    const response = await api.get<{ url: string }>(`auth/oauth/connect/${provider}`)

    return response
  }

  async logout() {
    const response = await api.post('auth/logout')

    return response
  }
}

export const authService = new AuthService()
