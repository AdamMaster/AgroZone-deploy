import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner-native'

import { useChatHistory } from '@/features/messages/hooks/use-chat-history'
import { appendMessage, removeMessage } from '@/features/messages/lib/chat-history'
import type { ChatHistory } from '@/features/messages/types/message.types'

import { supportApi } from '../api/support.api'
import type { SupportAdminConversation } from '../types/support.types'

export const supportAdminConversationsQueryKey = ['support', 'admin', 'conversations'] as const

export const supportAdminMessagesQueryKey = (conversationId: string) =>
  ['support', 'admin', 'messages', conversationId] as const

const showError = (error: Error) => toast.error(error.message)

// Список обновляется по сокету (useSupportRealtime), а при возвращении на
// экран — перезапросом.
export function useSupportAdminConversations() {
  return useQuery({
    queryKey: supportAdminConversationsQueryKey,
    queryFn: ({ signal }) => supportApi.adminConversations(signal)
  })
}

// Обращение из загруженного списка — для шапки переписки.
export function useSupportAdminConversation(conversationId: string) {
  const query = useSupportAdminConversations()

  return {
    conversation: query.data?.find(item => item.id === conversationId),
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch
  }
}

// Новые сообщения приходят по сокету, поэтому опроса нет.
export function useSupportAdminMessages(conversationId: string) {
  const queryKey = useMemo(() => supportAdminMessagesQueryKey(conversationId), [conversationId])
  const fetchPage = useMemo(
    () => (params: Parameters<typeof supportApi.adminMessages>[1], signal?: AbortSignal) =>
      supportApi.adminMessages(conversationId, params, signal),
    [conversationId]
  )

  return useChatHistory({ queryKey, fetchPage, pollIntervalMs: false })
}

export function useSendSupportAdminMessage(conversationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) => supportApi.adminSend(conversationId, text),
    // Своё сообщение видно сразу, эхо сокета не задвоит его (по id).
    onSuccess: message => {
      queryClient.setQueryData<ChatHistory>(supportAdminMessagesQueryKey(conversationId), current =>
        appendMessage(current, message)
      )
      void queryClient.invalidateQueries({ queryKey: supportAdminConversationsQueryKey })
    },
    onError: showError
  })
}

export function useMarkSupportAdminRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) => supportApi.adminMarkRead(conversationId),
    onSuccess: (_data, conversationId) =>
      queryClient.setQueryData<SupportAdminConversation[]>(supportAdminConversationsQueryKey, current =>
        current?.map(item => (item.id === conversationId ? { ...item, isUnread: false } : item))
      )
  })
}

export function useDeleteSupportAdminMessage(conversationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (messageId: string) => supportApi.adminDeleteMessage(conversationId, messageId),
    onSuccess: (_data, messageId) => {
      queryClient.setQueryData<ChatHistory>(supportAdminMessagesQueryKey(conversationId), current =>
        removeMessage(current, messageId)
      )
      // Превью в списке могло показывать как раз удалённое сообщение.
      void queryClient.invalidateQueries({ queryKey: supportAdminConversationsQueryKey })
    },
    onError: showError
  })
}

export function useClearSupportAdminMessages(conversationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => supportApi.adminDeleteAllMessages(conversationId),
    onSuccess: () => {
      queryClient.setQueryData<ChatHistory>(supportAdminMessagesQueryKey(conversationId), {
        messages: [],
        hasOlder: false
      })
      void queryClient.invalidateQueries({ queryKey: supportAdminConversationsQueryKey })
    },
    onError: showError
  })
}

export function useHideSupportAdminConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) => supportApi.adminHideConversation(conversationId),
    onSuccess: (_data, conversationId) =>
      queryClient.setQueryData<SupportAdminConversation[]>(supportAdminConversationsQueryKey, current =>
        current?.filter(item => item.id !== conversationId)
      ),
    onError: showError
  })
}

export function useBlockSupportGuest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (guestId: string) => supportApi.blockGuest(guestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAdminConversationsQueryKey }),
    onError: showError
  })
}

export function useUnblockSupportGuest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (guestId: string) => supportApi.unblockGuest(guestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportAdminConversationsQueryKey }),
    onError: showError
  })
}
