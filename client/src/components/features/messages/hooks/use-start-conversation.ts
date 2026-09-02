'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { conversationsService } from '../services/conversations.service'

export function useStartConversation() {
  const queryClient = useQueryClient()

  const { mutateAsync: startConversation, isPending: isStarting } = useMutation({
    mutationFn: ({ adId, text }: { adId: string; text: string }) => conversationsService.start(adId, text),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { startConversation, isStarting }
}
