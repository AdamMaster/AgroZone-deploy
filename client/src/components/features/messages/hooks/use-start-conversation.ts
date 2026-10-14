'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { conversationsService } from '../services/conversations.service'
import { IMessageDraft } from '../types/message.types'

export function useStartConversation() {
  const queryClient = useQueryClient()

  const { mutateAsync: startConversation, isPending: isStarting } = useMutation({
    mutationFn: ({ adId, draft }: { adId: string; draft: IMessageDraft }) => conversationsService.start(adId, draft),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { startConversation, isStarting }
}
