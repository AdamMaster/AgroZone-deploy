import type { UserProfile } from '@/features/auth/types/auth.types'

import type { SellerType } from '@/shared/constants/seller-types'

import { apiClient } from '@/lib/api/api-client'
import { type UploadFile, toFileFormData } from '@/lib/api/upload-file'

import type { SecurityEventsPage } from '../types/security-event.types'

// Документ до 15 МБ по мобильной сети грузится дольше обычных 15 секунд.
const PRESENTATION_UPLOAD_TIMEOUT_MS = 120_000
const AVATAR_UPLOAD_TIMEOUT_MS = 60_000

export interface UpdateProfileParams {
  name: string
  type: SellerType
}

export interface UpdatePasswordParams {
  // Только у аккаунта, где пароль уже есть: первый пароль (аккаунт через
  // Яндекс) ставится без него.
  currentPassword?: string
  newPassword: string
}

export interface RequestEmailChangeParams {
  newEmail: string
  password: string
  captchaToken: string
}

export interface SecurityEventsParams {
  page: number
  limit: number
  types?: readonly string[]
}

// Все изменения профиля сервер подтверждает актуальным профилем
// (UserService.getProfileForClient) — им сразу обновляется кэш, без
// повторного запроса.
export const profileApi = {
  updateProfile: (body: UpdateProfileParams) => apiClient.patch<UserProfile>('/users/profile', body),

  // ИНН проверяется через DaData; тип продавца сервер ставит по найденной
  // организации, даже если в форме был выбран другой.
  verifyBusiness: (inn: string) => apiClient.post<UserProfile>('/users/profile/business-verification', { inn }),

  updateAvatar: (file: UploadFile) =>
    apiClient.patch<UserProfile>('/users/profile/avatar', toFileFormData(file), {
      timeoutMs: AVATAR_UPLOAD_TIMEOUT_MS
    }),

  updatePresentation: (file: UploadFile) =>
    apiClient.patch<UserProfile>('/users/profile/presentation', toFileFormData(file), {
      timeoutMs: PRESENTATION_UPLOAD_TIMEOUT_MS
    }),

  removePresentation: () => apiClient.delete<UserProfile>('/users/profile/presentation'),

  updatePassword: (body: UpdatePasswordParams) => apiClient.patch<UserProfile>('/users/profile/password', body),

  toggleTwoFactor: () => apiClient.patch<UserProfile>('/users/2fa'),

  // Новый номер подтверждается звонком, как при регистрации: сервер выдаёт
  // номер, на который нужно позвонить.
  requestPhone: (phone: string) =>
    apiClient.post<{ success: boolean; callNumber: string }>('/users/profile/phones/request', { newPhone: phone }),

  phoneCallStatus: (signal?: AbortSignal) =>
    apiClient.post<{ confirmed: boolean; code?: string }>('/users/profile/phones/status', undefined, { signal }),

  confirmPhone: (code: string) =>
    apiClient.patch<{ success: boolean }>('/users/profile/phones/confirm', { code, makePrimary: true }),

  // Уже подтверждённый номер делается основным без повторного звонка.
  setPrimaryPhone: (phone: string) => apiClient.patch<{ success: boolean }>('/users/profile/phones/primary', { phone }),

  // Капчу сервер ждёт в заголовке recaptcha, как при входе.
  requestEmailChange: ({ captchaToken, ...body }: RequestEmailChangeParams) =>
    apiClient.post<{ success: boolean }>('/auth/email-change', body, { headers: { recaptcha: captchaToken } }),

  securityEvents: ({ page, limit, types }: SecurityEventsParams, signal?: AbortSignal) =>
    apiClient.get<SecurityEventsPage>('/users/profile/security-events', { params: { page, limit, types }, signal }),

  // У аккаунта с паролем сервер требует пароль для подтверждения; у
  // аккаунта только с входом через Яндекс пароля нет.
  deleteAccount: (password?: string) => apiClient.post<{ success: boolean }>('/users/profile/delete', { password })
}
