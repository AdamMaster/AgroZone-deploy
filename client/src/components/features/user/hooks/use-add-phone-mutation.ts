import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { userServices } from '../services'

export function useAddPhoneMutation() {
  const queryClient = useQueryClient()

  const { mutate: requestPhone, isPending: isRequesting } = useMutation({
    mutationFn: (phone: string) => userServices.requestAddPhone(phone),

    onSuccess: () => {
      toast.success('Код подтверждения отправлен')
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const message = error.message || 'Ошибка при отправке кода'

      toast.error(message)
    }
  })

  const { mutate: confirmPhone, isPending: isConfirming } = useMutation({
    mutationFn: ({ code, makePrimary }: { code: string; makePrimary?: boolean }) =>
      userServices.confirmAddPhone(code, makePrimary),

    onSuccess: () => {
      toast.success('Номер телефона добавлен')

      queryClient.invalidateQueries({
        queryKey: ['profile']
      })
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      // FetchClient кидает FetchError с плоским полем message (текст из
      // JSON-ответа сервера), а не error.response.data.message — из-за
      // этой неверной проверки реальная причина ошибки (например,
      // "Неверный код или срок его действия истек") подменялась общей
      // заглушкой, и понять, что на самом деле не так, было невозможно.
      const message = error.message || 'Неверный код подтверждения'

      toast.error(message)
    }
  })

  // Переключить основной номер аккаунта на уже подтверждённый номер —
  // используется только при открытии этой же формы со страницы профиля.
  const { mutate: setPrimaryPhone, isPending: isSettingPrimary } = useMutation({
    mutationFn: (phone: string) => userServices.setPrimaryPhone(phone),

    onSuccess: () => {
      toast.success('Основной номер изменён')

      queryClient.invalidateQueries({
        queryKey: ['profile']
      })
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      const message = error.message || 'Не удалось изменить основной номер'

      toast.error(message)
    }
  })

  // Опрос каждые 4 секунды, пока не поступит звонок с проверочного номера
  // (см. UserService.checkPhoneCallbackStatus на бэке).
  const usePhoneCallbackStatus = (enabled: boolean) =>
    useQuery({
      queryKey: ['phone callback status'],
      queryFn: () => userServices.checkPhoneCallbackStatus(),
      enabled,
      refetchInterval: 4000,
      retry: false
    })

  return {
    requestPhone,
    isRequesting,
    confirmPhone,
    isConfirming,
    setPrimaryPhone,
    isSettingPrimary,
    usePhoneCallbackStatus
  }
}
