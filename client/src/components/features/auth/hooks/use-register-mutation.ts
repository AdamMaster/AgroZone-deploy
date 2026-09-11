'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { METRIKA_GOALS, reachGoal, toastMessageHandler } from '@/shared/utils'

import { TypeRegisterSchema } from '../schemes'
import { authService } from '../services'

export function useRegisterMutation() {
  const { mutate: register, isPending: isLoadingRegister } = useMutation({
    mutationKey: ['register user'],

    mutationFn: ({ values, recaptcha }: { values: TypeRegisterSchema; recaptcha: string }) =>
      authService.register(values, recaptcha),

    onSuccess() {
      // Цель "registration" (F15 в ROADMAP.md) — см. также
      // use-register-sms-mutation.ts (SMS) и RegistrationGoalHandler
      // (OAuth) для двух других способов зарегистрироваться. Тост про
      // успех тут закомментирован ещё до меня (FormRegister сама вызывает
      // setView('register-message') на успехе — см. onSubmit) — не трогаю,
      // не имеет отношения к F15.
      reachGoal(METRIKA_GOALS.REGISTRATION)
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { register, isLoadingRegister }
}
