'use client'

import { api } from '@/shared/api'

import { IUser } from '../../auth/types'
import { TypeSettingsSchema } from '../schemes'
import { TypePasswordChangeSchema } from '../schemes/password-change.schema'
import { TypeDeleteAccountSchema } from '../schemes/delete-account.schema'

class UserServices {
  async findProfile() {
    const response = await api.get<IUser>('users/profile')

    return response
  }

  async updateProfile(body: TypeSettingsSchema) {
    const response = await api.patch<IUser>('users/profile', body)

    return response
  }

  // Подтверждение ИП/компании по ИНН — сервер сам проверяет ИНН через
  // DaData (см. UserController.verifyBusiness) и, если всё сошлось,
  // возвращает обновлённого пользователя с заполненными businessName/
  // businessVerifiedAt.
  async verifyBusiness(inn: string) {
    const response = await api.post<IUser>('users/profile/business-verification', { inn })

    return response
  }

  async updateAvatar(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.patch<IUser>('users/profile/avatar', formData)

    return response
  }

  async updatePassword(data: TypePasswordChangeSchema) {
    const { confirmPassword, ...payload } = data

    const response = await api.patch<boolean>('users/profile/password', payload)
    return response
  }

  async toggleTwoFactor() {
    const response = await api.patch<IUser>('users/2fa')

    return response
  }

  async requestPhoneChange(newPhone: string) {
    const response = await api.post<{ success: boolean; callNumber: string }>('users/profile/change-phone/request', {
      newPhone
    })

    return response
  }

  async confirmPhoneChange(code: string) {
    const response = await api.patch<{ success: boolean }>('users/profile/change-phone/confirm', {
      code
    })

    return response
  }

  async requestAddPhone(phone: string) {
    const response = await api.post<{ success: boolean; callNumber: string }>('users/profile/phones/request', {
      newPhone: phone
    })

    return response
  }

  async confirmAddPhone(code: string, makePrimary?: boolean) {
    const response = await api.patch<{ success: boolean }>('users/profile/phones/confirm', {
      code,
      makePrimary
    })

    return response
  }

  // Опрос, пока пользователь не позвонит на выданный номер — общий для
  // обоих флоу (смена/добавление номера), см. UserController.checkPhoneCallbackStatus.
  async checkPhoneCallbackStatus() {
    const response = await api.post<{ confirmed: boolean; code?: string }>('users/profile/phones/status')
    return response
  }

  // Сделать уже добавленный и подтверждённый номер основным — без SMS,
  // повторного подтверждения не требуется.
  async setPrimaryPhone(phone: string) {
    const response = await api.patch<{ success: boolean }>('users/profile/phones/primary', {
      phone
    })

    return response
  }

  // POST, а не DELETE — нужно передать пароль в теле запроса, а
  // api.delete() тела не поддерживает (см. shared/fetch/fetch-client.ts).
  async deleteAccount(data: TypeDeleteAccountSchema) {
    const response = await api.post<{ success: boolean }>('users/profile/delete', data)

    return response
  }
}

export const userServices = new UserServices()
