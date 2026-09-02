import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { UserType } from '@/components/features/auth/types'

import { USER_TYPE_LABELS } from '@/shared/constants/user-types'
import { toastMessageHandler } from '@/shared/utils'

import { userServices } from '../services'

interface VerifyBusinessParams {
  inn: string
  // Тип, выбранный в форме на момент вызова (см. ContentGeneral) — нужен
  // только для сравнения с тем, что реально нашла DaData в onSuccess, на
  // сервер не отправляется (сервер сам решает итоговый тип по ИНН, см.
  // UserService.verifyBusiness).
  expectedType: UserType
}

export function useVerifyBusinessMutation() {
  const queryClient = useQueryClient()

  const { mutate: verifyBusiness, isPending: isLoadingVerifyBusiness } = useMutation({
    mutationKey: ['verify business'],
    mutationFn: ({ inn }: VerifyBusinessParams) => userServices.verifyBusiness(inn),
    onSuccess(data, variables) {
      // ИНН — источник истины: если по нему нашёлся не тот тип, что был
      // выбран в форме (например, выбрали "Компания", а ИНН оказался от
      // ИП), сервер всё равно сохраняет реальный найденный тип. Явно
      // сообщаем об этом отдельным тостом, а не молча меняем значение в
      // форме — иначе выглядело бы как баг ("я же выбрал Компания").
      if (data.type !== variables.expectedType) {
        toast.success(`По этому ИНН найден тип "${USER_TYPE_LABELS[data.type]}" — тип продавца обновлён`)
      } else {
        toast.success('Организация подтверждена')
      }

      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { verifyBusiness, isLoadingVerifyBusiness }
}
