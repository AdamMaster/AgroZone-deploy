'use client'

import { Ellipsis } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'

import { UserRole } from '@/components/features/auth/types'
import { SupportConversationListItem } from '@/components/features/support/components/support-conversation-list-item'
import { SupportParticipantChat } from '@/components/features/support/components/support-participant-chat'
import { Heading } from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { useProfile } from '@/shared/hooks'

import { useConversations } from '../hooks'
import { ChatPane } from './chat-pane'
import { ConversationList } from './conversation-list'

// Значение ?c= для чата поддержки — у него нет conversationId в списке
// диалогов объявлений (это отдельный тикет, см. SupportParticipantChat).
const SUPPORT_CHAT_PARAM = 'support'

export const MessagesClient = () => {
  const router = useRouter()
  const { user } = useProfile()
  const searchParams = useSearchParams()

  const activeConversationId = searchParams.get('c')
  const newAdId = searchParams.get('ad')

  const { conversations, isLoading } = useConversations()

  const existingForAd = useMemo(
    () => (newAdId ? conversations.find(item => item.ad.id === newAdId) : undefined),
    [conversations, newAdId]
  )

  useEffect(() => {
    if (!existingForAd) return

    const params = new URLSearchParams(searchParams.toString())
    params.delete('ad')
    params.set('c', existingForAd.id)
    router.replace(`/profile/settings/messages?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingForAd])

  const handleSelect = (id: string) => {
    router.push(`/profile/settings/messages?c=${id}`)
  }

  const handleStarted = (conversationId: string) => {
    router.replace(`/profile/settings/messages?c=${conversationId}`)
  }

  const handleBack = () => {
    router.back()
  }

  // Админ отвечает на обращения в своём инбоксе (панель чата поддержки), у
  // него «Поддержки» как собеседника нет.
  const isSupportAvailable = !!user && user.role !== UserRole.Admin
  const isSupportChatOpen = isSupportAvailable && activeConversationId === SUPPORT_CHAT_PARAM
  const isChatOpen = !!activeConversationId || !!newAdId

  return (
    <div>
      <div className='mb-6 flex justify-between'>
        <Heading level={2}>Сообщения</Heading>
        <DropdownMenu>
          <DropdownMenuTrigger
            className='flex size-9 items-center justify-center rounded-lg hover:bg-gray-100'
            aria-label='Ещё'
          >
            <Ellipsis className='size-5' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => router.push('/profile/settings/blocked')}>Черный список</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className='flex h-[600px]'>
        {isSupportChatOpen ? (
          <SupportParticipantChat onBack={handleBack} />
        ) : isChatOpen ? (
          <ChatPane
            activeConversationId={activeConversationId}
            conversations={conversations}
            newAdId={!activeConversationId ? newAdId : null}
            onStarted={handleStarted}
            onBack={handleBack}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            isLoading={isLoading}
            activeId={activeConversationId}
            onSelect={handleSelect}
            pinnedItem={
              isSupportAvailable && <SupportConversationListItem onClick={() => handleSelect(SUPPORT_CHAT_PARAM)} />
            }
          />
        )}
      </div>
    </div>
  )
}
