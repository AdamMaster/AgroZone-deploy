'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { TypePhoneSchema } from '../schemes'
import { passwordRecoveryService } from '../services'

const CALL_STATUS_QUERY_KEY = 'reset password call status'

export function useResetPasswordPhoneMutation() {
  const queryClient = useQueryClient()

  const { mutate: startPhoneReset, isPending: isLoadingPhoneStart } = useMutation({
    mutationKey: ['reset password phone start'],
    mutationFn: (values: TypePhoneSchema) => passwordRecoveryService.phoneStart(values),
    onSuccess() {
      // Новый звонок — новая проверка: ответ опроса от прошлого звонка по тому
      // же номеру (подтверждён или с ошибкой) к ней не относится.
      queryClient.removeQueries({ queryKey: [CALL_STATUS_QUERY_KEY] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  const { mutate: newPasswordByPhone, isPending: isLoadingNewPasswordByPhone } = useMutation({
    mutationKey: ['reset password phone new'],
    mutationFn: (data: { phone: string; code: string; password: string }) => passwordRecoveryService.phoneNew(data),
    onSuccess() {
      toast.success('Пароль успешно изменен', {
        description: 'Теперь вы можете войти в свой аккаунт.'
      })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  // Опрос каждые 4 секунды, пока не поступит звонок с проверочного номера —
  // enabled управляется снаружи (только пока показан экран ожидания звонка).
  // Опрос заканчивается, когда звонок подтверждён или вышло время ожидания
  // (ошибка) — тогда экран предлагает запросить звонок заново.
  const useResetCallStatus = (phone: string, enabled: boolean) =>
    useQuery({
      queryKey: [CALL_STATUS_QUERY_KEY, phone],
      queryFn: () => passwordRecoveryService.phoneStatus(phone),
      enabled,
      refetchInterval: query => (query.state.error || query.state.data?.confirmed ? false : 4000),
      retry: false
    })

  return {
    startPhoneReset,
    isLoadingPhoneStart,
    newPasswordByPhone,
    isLoadingNewPasswordByPhone,
    useResetCallStatus
  }
}
