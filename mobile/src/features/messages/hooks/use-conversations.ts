import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIsFocused } from 'expo-router'
import { useMemo } from 'react'

import { useIsSignedIn } from '@/features/auth/hooks/use-is-signed-in'

import { showError } from '@/lib/ui/show-error'

import { blockedUsersApi } from '../api/blocked-users.api'
import { type MessagesPageParams, conversationsApi } from '../api/conversations.api'
import { appendMessage } from '../lib/chat-history'
import { useConversationsSocketStore } from '../store/conversations-socket-store'
import type { BlockedUser, ChatHistory, ConversationListItem, MessageDraft } from '../types/message.types'
import { useChatHistory } from './use-chat-history'

// Новые сообщения приходят по сокету (useConversationsRealtime). Пока он не
// подключён (старый сервер, плохая сеть), опрашиваем: список раз в 5 секунд,
// открытый диалог — раз в 3.
const CONVERSATIONS_POLL_INTERVAL_MS = 5000
const MESSAGES_POLL_INTERVAL_MS = 3000

export const conversationsQueryKey = ['conversations'] as const
const blockedUsersQueryKey = ['blocked-users'] as const

export const conversationMessagesQueryKey = (conversationId: string) =>
  [...conversationsQueryKey, conversationId, 'messages'] as const

export function useConversations() {
  const isSignedIn = useIsSignedIn()
  const isFocused = useIsFocused()
  const isSocketConnected = useConversationsSocketStore(state => state.isConnected)

  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: ({ signal }) => conversationsApi.list(signal),
    enabled: isSignedIn,
    refetchInterval: isFocused && !isSocketConnected ? CONVERSATIONS_POLL_INTERVAL_MS : false
  })
}

// Диалог из уже загруженного списка — для шапки чата (собеседник,
// объявление). Чат, открытый по уведомлению, сам загрузит список.
export function useConversation(conversationId: string) {
  const { data, isPending } = useConversations()

  return { conversation: data?.find(item => item.id === conversationId), isPending }
}

export function useConversationMessages(conversationId: string) {
  const isSocketConnected = useConversationsSocketStore(state => state.isConnected)
  const queryKey = useMemo(() => conversationMessagesQueryKey(conversationId), [conversationId])
  const fetchPage = useMemo(
    () => (params: MessagesPageParams, signal?: AbortSignal) =>
      conversationsApi.messages(conversationId, params, signal),
    [conversationId]
  )

  return useChatHistory({ queryKey, fetchPage, pollIntervalMs: isSocketConnected ? false : MESSAGES_POLL_INTERVAL_MS })
}

export function useSendConversationMessage(conversationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (draft: MessageDraft) => conversationsApi.send(conversationId, draft),
    // Своё сообщение видно сразу, не дожидаясь очередного опроса.
    onSuccess: message => {
      queryClient.setQueryData<ChatHistory>(conversationMessagesQueryKey(conversationId), current =>
        appendMessage(current, message)
      )
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
    },
    onError: showError
  })
}

// Первое сообщение по объявлению — создаёт диалог (или дописывает в уже
// существующий).
export function useStartConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ adId, draft }: { adId: string; draft: MessageDraft }) => conversationsApi.start(adId, draft),
    onSuccess: ({ conversation, message }) => {
      queryClient.setQueryData<ChatHistory>(conversationMessagesQueryKey(conversation.id), current =>
        appendMessage(current, message)
      )
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
    },
    onError: showError
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) => conversationsApi.markRead(conversationId),
    onSuccess: (_data, conversationId) =>
      queryClient.setQueryData<ConversationListItem[]>(conversationsQueryKey, current =>
        current?.map(item => (item.id === conversationId ? { ...item, isUnread: false } : item))
      )
  })
}

// Продавец отмечает сделку состоявшейся или снимает отметку. Состояние берём
// из ответа сервера, а не из нажатой кнопки: запрос идемпотентен, и если
// отметка уже поставлена с другого устройства, на экране будет реальное
// значение.
export function useSetDeal(conversationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (confirmed: boolean) => conversationsApi.setDeal(conversationId, confirmed),
    onSuccess: ({ dealConfirmedAt }) =>
      queryClient.setQueryData<ConversationListItem[]>(conversationsQueryKey, current =>
        current?.map(item => (item.id === conversationId ? { ...item, dealConfirmedAt } : item))
      ),
    onError: showError
  })
}

// Удалить переписку и заблокировать — диалог сразу пропадает из списка, не
// дожидаясь опроса.
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (conversationId: string) => conversationsApi.remove(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<ConversationListItem[]>(conversationsQueryKey, current =>
        current?.filter(item => item.id !== conversationId)
      )
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
    },
    onError: showError
  })
}

export function useBlockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => blockedUsersApi.block(userId),
    // Сервер прячет диалоги с заблокированным — убираем их сразу.
    onSuccess: (_data, userId) => {
      queryClient.setQueryData<ConversationListItem[]>(conversationsQueryKey, current =>
        current?.filter(item => item.counterpart.id !== userId)
      )
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
      void queryClient.invalidateQueries({ queryKey: blockedUsersQueryKey })
    },
    onError: showError
  })
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: blockedUsersQueryKey,
    queryFn: ({ signal }) => blockedUsersApi.list(signal)
  })
}

export function useUnblockUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => blockedUsersApi.unblock(userId),
    // Разблокировка возвращает скрытые из-за неё диалоги.
    onSuccess: (_data, userId) => {
      queryClient.setQueryData<BlockedUser[]>(blockedUsersQueryKey, current =>
        current?.filter(item => item.id !== userId)
      )
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
    },
    onError: showError
  })
}
