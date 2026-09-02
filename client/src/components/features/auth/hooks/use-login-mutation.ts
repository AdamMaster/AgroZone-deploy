'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { TypeLoginSchema } from '../schemes'
import { authService } from '../services'

export function useLoginMutation(setIsShowTwoFactor: Dispatch<SetStateAction<boolean>>) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { mutate: login, isPending: isLoadingLogin } = useMutation({
    mutationKey: ['login user'],

    mutationFn: ({ values, recaptcha }: { values: TypeLoginSchema; recaptcha?: string }) =>
      authService.login(values, recaptcha),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess(data: any) {
      if (data.message) {
        toast.info('Проверьте вашу почту', { description: 'Требуется код двухфакторной аутентификации.' })
        setIsShowTwoFactor(true)

        return data
      } else {
        toast.success('Вы успешно вошли в аккаунт!')
        // Раньше глобальный staleTime: 0 сам форсировал рефетч профиля
        // при монтировании /profile/settings. Теперь глобальный
        // staleTime не 0, так что если ['profile'] уже был закэширован
        // (например, до логина как unauthenticated-состояние), страница
        // могла бы мигнуть старыми данными — инвалидируем явно.
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        router.push('/profile/settings')

        return data
      }
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { login, isLoadingLogin }
}
