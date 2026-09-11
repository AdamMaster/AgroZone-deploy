'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { METRIKA_GOALS, reachGoal, toastMessageHandler } from '@/shared/utils'

import { TypeRegisterSmsFinalSchema, TypeRegisterSmsPhoneSchema } from '../schemes'
import { authService } from '../services'

export function useRegisterSmsMutation() {
  const queryClient = useQueryClient()

  const { mutate: registerSmsStart, isPending: isLoadingSmsStart } = useMutation({
    mutationKey: ['register sms start'],
    mutationFn: ({ values, recaptcha }: { values: TypeRegisterSmsPhoneSchema; recaptcha: string }) =>
      authService.registerSmsStart(values, recaptcha),
    onError(error) {
      toastMessageHandler(error)
    }
  })

  const { mutate: verifyRegisterCode, isPending: isLoadingCode } = useMutation({
    mutationKey: ['register check code'],
    mutationFn: (data: { phone: string; code: string }) => authService.checkRegisterCode(data),
    onError(error) {
      toastMessageHandler(error)
    }
  })

  const { mutate: registerSmsFinal, isPending: isLoadingSmsFinal } = useMutation({
    mutationKey: ['register sms final'],
    mutationFn: (data: TypeRegisterSmsFinalSchema & { phone: string; code: string }) =>
      authService.registerSmsComplete(data),

    onSuccess() {
      toast.success('Регистрация успешно завершена!')
      queryClient.invalidateQueries({ queryKey: ['profile'] })

      // Цель "registration" (F15 в ROADMAP.md) — см. также use-register-
      // mutation.ts (email) и RegistrationGoalHandler (OAuth) для двух
      // других способов зарегистрироваться.
      reachGoal(METRIKA_GOALS.REGISTRATION)
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  // Опрос каждые 4 секунды, пока не поступит звонок с проверочного номера
  // (см. AuthService.checkSmsCallbackStatus на бэке) — enabled управляется
  // снаружи (только пока показан экран ожидания звонка).
  const useSmsCallbackStatus = (phone: string, enabled: boolean) =>
    useQuery({
      queryKey: ['register sms callback status', phone],
      queryFn: () => authService.checkSmsCallbackStatus(phone),
      enabled,
      refetchInterval: 4000,
      retry: false
    })

  return {
    registerSmsStart,
    isLoadingSmsStart,
    verifyRegisterCode,
    isLoadingCode,
    registerSmsFinal,
    isLoadingSmsFinal,
    useSmsCallbackStatus
  }
}
