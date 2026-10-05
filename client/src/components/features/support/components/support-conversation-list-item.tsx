'use client'

import { useSupportChatStore } from '@/store'
import { Headset } from 'lucide-react'

interface SupportConversationListItemProps {
  // Админ видит не собеседника «Поддержка», а входящие обращения.
  isAdmin: boolean
  onClick: () => void
}

// Закреплённая строка в списке диалогов на странице «Сообщения» — вход в чат
// поддержки (участнику) или в инбокс обращений (админу). На мобильном
// плавающей кнопки чата у залогиненного нет, см. SupportChatWidget. Внешний
// вид — в тон обычных диалогов (ConversationListItem).
export const SupportConversationListItem = ({ isAdmin, onClick }: SupportConversationListItemProps) => {
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
        <span className='text-base leading-5 font-semibold sm:text-[16px]'>
          {isAdmin ? 'Обращения в поддержку' : 'Поддержка AgroZone'}
        </span>
        <span className='truncate text-sm text-gray-500'>
          {isAdmin ? 'Вопросы пользователей и гостей' : 'Задайте вопрос по работе площадки'}
        </span>
      </span>
      {hasUnread && <span className='bg-primary size-2 shrink-0 rounded-full' aria-label='Есть новые сообщения' />}
    </button>
  )
}
