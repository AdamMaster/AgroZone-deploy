import { api } from '@/shared/api'

import { TypeNewPasswordSchema, TypeResetPasswordSchema } from '../schemes'
import { IUser } from '../types'

class PasswordRecoveryService {
  async reset(body: TypeResetPasswordSchema, recaptcha?: string) {
    const headers = recaptcha ? { recaptcha } : undefined

    const response = await api.post<IUser>('auth/password-recovery/reset', body, { headers })

    return response
  }

  async new(body: TypeNewPasswordSchema, token: string | null, recaptcha?: string) {
    const headers = recaptcha ? { recaptcha } : undefined

    const response = await api.post<IUser>(`auth/password-recovery/new/${token}`, body, { headers })

    return response
  }

  // Сброс по звонку на номер: те же три шага, что у регистрации по звонку —
  // номер → звонок на проверочный номер (опрос статуса) → новый пароль.
  async phoneStart(body: { phone: string }) {
    const response = await api.post<{ message: string; callNumber: string }>('auth/password-recovery/phone/start', body)

    return response
  }

  async phoneStatus(phone: string) {
    const response = await api.post<{ confirmed: boolean; code?: string }>('auth/password-recovery/phone/status', {
      phone
    })

    return response
  }

  async phoneNew(body: { phone: string; code: string; password: string }) {
    const response = await api.post<boolean>('auth/password-recovery/phone/new', body)

    return response
  }
}

export const passwordRecoveryService = new PasswordRecoveryService()
