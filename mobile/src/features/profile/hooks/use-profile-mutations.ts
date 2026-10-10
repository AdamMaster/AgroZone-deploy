import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { profileQueryKey } from '@/features/auth/store/auth-store'
import type { UserProfile } from '@/features/auth/types/auth.types'

import { SELLER_TYPE_LABELS, type SellerType } from '@/shared/constants/seller-types'

import type { UploadFile } from '@/lib/api/upload-file'

import { type RequestEmailChangeParams, type UpdateProfileParams, profileApi } from '../api/profile.api'
import { securityEventsQueryKeyPrefix } from './use-security-events'

const showError = (error: Error) => toast.error(error.message)

// Профиль после изменения: кладём ответ сервера в кэш (сервер возвращает
// актуальный профиль) и обновляем журнал безопасности — изменение могло
// добавить в него запись.
function useApplyProfile() {
  const queryClient = useQueryClient()

  return (profile: UserProfile) => {
    queryClient.setQueryData(profileQueryKey, profile)
    void queryClient.invalidateQueries({ queryKey: securityEventsQueryKeyPrefix })
  }
}

// Ручки, которые профиль не возвращают (телефоны), — профиль перезапрашиваем.
function useRefreshProfile() {
  const queryClient = useQueryClient()

  return () => queryClient.invalidateQueries({ queryKey: profileQueryKey })
}

export function useUpdateProfile() {
  const applyProfile = useApplyProfile()

  return useMutation({
    mutationFn: (params: UpdateProfileParams) => profileApi.updateProfile(params),
    onSuccess: profile => {
      applyProfile(profile)
      toast.success('Профиль успешно обновлен')
    },
    onError: showError
  })
}

interface VerifyBusinessParams {
  inn: string
  // Тип, выбранный в форме, — только чтобы сравнить с найденным по ИНН; на
  // сервер не уходит.
  expectedType: SellerType
}

export function useVerifyBusiness() {
  const applyProfile = useApplyProfile()

  return useMutation({
    mutationFn: ({ inn }: VerifyBusinessParams) => profileApi.verifyBusiness(inn),
    onSuccess: (profile, { expectedType }) => {
      applyProfile(profile)
      // ИНН — источник истины: если по нему найден другой тип, чем выбран в
      // форме, сервер сохраняет найденный. Говорим об этом прямо, как сайт.
      toast.success(
        profile.type !== expectedType
          ? `По этому ИНН найден тип "${SELLER_TYPE_LABELS[profile.type]}" — тип продавца обновлён`
          : 'Организация подтверждена'
      )
    },
    onError: showError
  })
}

export function useUpdateAvatar() {
  const applyProfile = useApplyProfile()

  return useMutation({
    mutationFn: (file: UploadFile) => profileApi.updateAvatar(file),
    onSuccess: profile => {
      applyProfile(profile)
      toast.success('Аватар успешно обновлен')
    },
    onError: showError
  })
}

export function useUpdatePresentation() {
  const applyProfile = useApplyProfile()

  return useMutation({
    mutationFn: (file: UploadFile) => profileApi.updatePresentation(file),
    onSuccess: profile => {
      applyProfile(profile)
      toast.success('Презентация загружена')
    },
    onError: showError
  })
}

export function useRemovePresentation() {
  const applyProfile = useApplyProfile()

  return useMutation({
    mutationFn: () => profileApi.removePresentation(),
    onSuccess: profile => {
      applyProfile(profile)
      toast.success('Презентация удалена')
    },
    onError: showError
  })
}

export function useToggleTwoFactor() {
  const applyProfile = useApplyProfile()

  return useMutation({
    mutationFn: () => profileApi.toggleTwoFactor(),
    onSuccess: profile => {
      applyProfile(profile)
      toast.success('Настройки двухфакторной аутентификации изменены')
    },
    onError: showError
  })
}

// Ошибки смены пароля и почты форма показывает у полей сама.
export function useUpdatePassword() {
  const applyProfile = useApplyProfile()

  return useMutation({
    mutationFn: profileApi.updatePassword,
    onSuccess: applyProfile
  })
}

export function useRequestEmailChange() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: RequestEmailChangeParams) => profileApi.requestEmailChange(params),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: securityEventsQueryKeyPrefix })
  })
}

export function useRequestPhone() {
  return useMutation({
    mutationFn: (phone: string) => profileApi.requestPhone(phone),
    onError: showError
  })
}

export function useConfirmPhone() {
  const refreshProfile = useRefreshProfile()

  return useMutation({
    mutationFn: (code: string) => profileApi.confirmPhone(code),
    onSuccess: async () => {
      await refreshProfile()
      toast.success('Номер телефона добавлен')
    },
    onError: showError
  })
}

export function useSetPrimaryPhone() {
  const refreshProfile = useRefreshProfile()

  return useMutation({
    mutationFn: (phone: string) => profileApi.setPrimaryPhone(phone),
    onSuccess: async () => {
      await refreshProfile()
      toast.success('Основной номер изменён')
    },
    onError: showError
  })
}
