import { Skeleton } from '@/components/ui'

import { ISupportAdminConversationListItem } from '../types/support.types'
import { SupportAdminConversationListItem } from './support-admin-conversation-list-item'

interface SupportAdminConversationListProps {
  conversations: ISupportAdminConversationListItem[]
  isLoading: boolean
  onSelect: (id: string) => void
}

export const SupportAdminConversationList = ({
  conversations,
  isLoading,
  onSelect
}: SupportAdminConversationListProps) => {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
      <div className='bg-primary border-b border-gray-100 px-4 py-3 text-[#fff]'>
        <p className='text-sm font-semibold'>Обращения в поддержку</p>
      </div>

      <div className='flex flex-col gap-1 px-1 py-1'>
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div className='flex w-full items-center gap-3 px-2 py-2' key={i}>
              <Skeleton className='size-10 shrink-0 rounded-full' />
              <Skeleton className='h-10 w-full rounded-lg' />
            </div>
          ))}

        {!isLoading && conversations.length === 0 && (
          <div className='p-4 text-center text-sm text-gray-500'>Пока нет ни одного обращения</div>
        )}

        {conversations.map(conversation => (
          <SupportAdminConversationListItem
            key={conversation.id}
            conversation={conversation}
            isActive={false}
            onClick={() => onSelect(conversation.id)}
          />
        ))}
      </div>
    </div>
  )
}
