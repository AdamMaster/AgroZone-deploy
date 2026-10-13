'use client'

import { useProfile } from '@/shared/hooks'

import { useConversationsSocket } from '../hooks/use-conversations-socket'

// Живое соединение с диалогами по объявлениям, пока пользователь вошёл.
// Смонтирован в корневом layout (как SupportChatWidget): список диалогов и
// бейдж непрочитанного в меню настроек нужны не только на странице сообщений.
export const ConversationsRealtime = () => {
  const { user } = useProfile()

  useConversationsSocket(!!user)

  return null
}
