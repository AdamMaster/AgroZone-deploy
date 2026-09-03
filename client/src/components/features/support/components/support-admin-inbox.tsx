'use client'

import { useSupportChatStore } from '@/store'

import { useSupportAdminConversations } from '../hooks'
import { SupportAdminConversationList } from './support-admin-conversation-list'
import { SupportAdminThread } from './support-admin-thread'

export const SupportAdminInbox = () => {
  const { activeAdminConversationId, setActiveAdminConversationId } = useSupportChatStore()
  const { conversations, isLoading } = useSupportAdminConversations(true)

  const activeConversation = conversations.find(item => item.id === activeAdminConversationId)

  if (activeConversation) {
    return <SupportAdminThread conversation={activeConversation} onBack={() => setActiveAdminConversationId(null)} />
  }

  return (
    <SupportAdminConversationList
      conversations={conversations}
      isLoading={isLoading}
      onSelect={setActiveAdminConversationId}
    />
  )
}
