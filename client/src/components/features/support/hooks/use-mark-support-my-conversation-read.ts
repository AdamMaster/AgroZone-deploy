'use client'

import { useMutation } from '@tanstack/react-query'

import { supportService } from '../services/support.service'

export function useMarkSupportMyConversationRead() {
  const { mutate: markRead } = useMutation({
    mutationFn: () => supportService.markMyConversationRead()
  })

  return { markRead }
}
