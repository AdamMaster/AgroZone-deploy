'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { supportService } from '../services/support.service'

export function useBlockSupportGuest() {
  const queryClient = useQueryClient()

  const { mutate: blockGuest, isPending: isBlocking } = useMutation({
    mutationFn: (guestId: string) => supportService.blockGuest(guestId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { blockGuest, isBlocking }
}
