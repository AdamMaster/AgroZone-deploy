import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { useChatHistory } from '@/features/messages/hooks/use-chat-history'
import { appendMessage } from '@/features/messages/lib/chat-history'
import type { ChatHistory } from '@/features/messages/types/message.types'

import { supportApi } from '../api/support.api'

export const supportMessagesQueryKey = ['support', 'messages'] as const

// Новые сообщения поддержки приходят по сокету (useSupportRealtime), поэтому
// опрос не нужен.
export function useSupportMessages() {
  return useChatHistory({ queryKey: supportMessagesQueryKey, fetchPage: supportApi.messages, pollIntervalMs: false })
}

export function useSendSupportMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) => supportApi.send(text),
    onSuccess: message =>
      queryClient.setQueryData<ChatHistory>(supportMessagesQueryKey, current => appendMessage(current, message)),
    onError: error => toast.error(error.message)
  })
}

export function useMarkSupportRead() {
  return useMutation({ mutationFn: () => supportApi.markRead() })
}
