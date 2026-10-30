import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { IUser } from '../../auth/types'
import { userServices } from '../services'

const PROFILE_KEY = ['profile']

// Переключатель «Письма о новых сообщениях»: состояние меняется сразу (без
// ожидания ответа сервера), а при ошибке возвращается как было.
export function useChatEmailNotificationsMutation() {
  const queryClient = useQueryClient()

  const { mutate: setChatEmailNotifications, isPending: isChatEmailNotificationsLoading } = useMutation({
    mutationKey: ['chat email notifications'],
    mutationFn: (enabled: boolean) => userServices.updateChatEmailNotifications(enabled),

    async onMutate(enabled) {
      await queryClient.cancelQueries({ queryKey: PROFILE_KEY })

      const previous = queryClient.getQueryData<IUser>(PROFILE_KEY)

      if (previous) {
        queryClient.setQueryData<IUser>(PROFILE_KEY, { ...previous, chatEmailNotifications: enabled })
      }

      return { previous }
    },

    onError(error, _enabled, context) {
      if (context?.previous) {
        queryClient.setQueryData(PROFILE_KEY, context.previous)
      }

      toastMessageHandler(error)
    },

    onSuccess(_user, enabled) {
      toast.success(enabled ? 'Письма о сообщениях включены' : 'Письма о сообщениях отключены')
    },

    onSettled() {
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY })
    }
  })

  return { setChatEmailNotifications, isChatEmailNotificationsLoading }
}
