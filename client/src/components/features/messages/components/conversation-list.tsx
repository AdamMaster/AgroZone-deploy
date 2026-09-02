import { Skeleton } from '@/components/ui'

import { IConversationListItem } from '../types/message.types'
import { ConversationListItem } from './conversation-list-item'

interface ConversationListProps {
  conversations: IConversationListItem[]
  activeId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
}

export const ConversationList = ({ conversations, activeId, isLoading, onSelect }: ConversationListProps) => {
  return (
    <div className='flex w-full flex-col gap-1 overflow-y-auto sm:-ml-3'>
      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <div className='flex w-full items-center gap-3' key={i}>
            <Skeleton className='size-15 min-w-15 rounded-lg' />
            <Skeleton className='h-15 w-full rounded-lg' />
          </div>
        ))}

      {!isLoading && conversations.length === 0 && (
        <div className='p-4 text-sm text-gray-500'>
          Пока нет ни одного диалога — напишите продавцу со страницы объявления.
        </div>
      )}

      {conversations.map(conversation => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeId}
          onClick={() => onSelect(conversation.id)}
        />
      ))}
    </div>
  )
}
