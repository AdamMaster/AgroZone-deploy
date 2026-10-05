'use client'

import { useSupportChatStore } from '@/store'
import { Headset } from 'lucide-react'

interface SupportConversationListItemProps {
  onClick: () => void
}

// Закреплённая строка «Поддержка AgroZone» в списке диалогов на странице
// «Сообщения» — вход в чат поддержки для залогиненного участника (на мобильном
// плавающей кнопки чата у него нет, см. SupportChatWidget). Внешний вид — в
// тон обычных диалогов (ConversationListItem).
export const SupportConversationListItem = ({ onClick }: SupportConversationListItemProps) => {
  const hasUnread = useSupportChatStore(state => state.hasUnread)

  return (
    <button
      type='button'
      onClick={onClick}
      className='flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 py-2 text-left transition-colors hover:bg-gray-100 sm:rounded-lg sm:px-3 sm:py-3'
    >
      <span className='bg-primary flex size-15 shrink-0 items-center justify-center rounded-lg text-white'>
        <Headset className='size-6' />
      </span>
      <span className='flex min-w-0 flex-1 flex-col sm:gap-0.5'>
        <span className='text-base leading-5 font-semibold sm:text-[16px]'>Поддержка AgroZone</span>
        <span className='truncate text-sm text-gray-500'>Задайте вопрос по работе площадки</span>
      </span>
      {hasUnread && <span className='bg-primary size-2 shrink-0 rounded-full' aria-label='Есть новый ответ' />}
    </button>
  )
}
