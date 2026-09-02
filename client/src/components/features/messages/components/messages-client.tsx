'use client'

import { Ellipsis } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'

import { Heading } from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { useConversations } from '../hooks'
import { ChatPane } from './chat-pane'
import { ConversationList } from './conversation-list'

export const MessagesClient = () => {
  const router = useRouter()
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
        {isChatOpen ? (
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
          />
        )}
      </div>
    </div>
  )
}
