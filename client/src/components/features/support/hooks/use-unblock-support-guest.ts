'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { supportService } from '../services/support.service'

export function useUnblockSupportGuest() {
  const queryClient = useQueryClient()

  const { mutate: unblockGuest, isPending: isUnblocking } = useMutation({
    mutationFn: (guestId: string) => supportService.unblockGuest(guestId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { unblockGuest, isUnblocking }
}
