'use client'

import { useSupportChatStore } from '@/store'
import { useEffect } from 'react'

import { useSupportAdminConversations } from '../hooks'
import { SupportAdminConversationList } from './support-admin-conversation-list'
import { SupportAdminThread } from './support-admin-thread'

interface SupportAdminInboxProps {
  // Есть, когда инбокс встроен в страницу «Сообщения» (а не открыт в панели с
  // собственным крестиком) — тогда в шапке списка показывается стрелка «назад».
  onBack?: () => void
}

export const SupportAdminInbox = ({ onBack }: SupportAdminInboxProps) => {
  const activeAdminConversationId = useSupportChatStore(state => state.activeAdminConversationId)
  const setActiveAdminConversationId = useSupportChatStore(state => state.setActiveAdminConversationId)
  const setHasUnread = useSupportChatStore(state => state.setHasUnread)
  const { conversations, isLoading } = useSupportAdminConversations(true)

  // Инбокс открыт и на него смотрят — новое обращение, из-за которого
  // обновился список, уже на виду (непрочитанные подсвечены в самом списке).
  useEffect(() => {
    setHasUnread(false)
  }, [conversations, setHasUnread])

  // Закрыли инбокс (панель или переход со страницы «Сообщения») — тред больше
  // не открыт, иначе виджет продолжал бы считать его активным.
  useEffect(() => () => setActiveAdminConversationId(null), [setActiveAdminConversationId])

  const activeConversation = conversations.find(item => item.id === activeAdminConversationId)

  if (activeConversation) {
    return <SupportAdminThread conversation={activeConversation} onBack={() => setActiveAdminConversationId(null)} />
  }

  return (
    <SupportAdminConversationList
      conversations={conversations}
      isLoading={isLoading}
      onSelect={setActiveAdminConversationId}
      onBack={onBack}
    />
  )
}
