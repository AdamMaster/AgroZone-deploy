import { Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'

import { ISupportMessage } from '../types/support.types'
import { formatMessageTime } from '@/components/features/messages/utils/format-message-time'

interface SupportMessageBubbleProps {
  message: ISupportMessage
  isOwn: boolean
  // Передаётся только из SupportAdminThread (см. SupportMessageThread) —
  // у гостя/участника этого prop нет вообще, компонент здесь просто не
  // знает о существовании удаления, это не спрятанная кнопка, а
  // отсутствующая возможность.
  onDelete?: () => void
}

// Проще, чем MessageBubble у AD-диалогов (см.
// components/features/messages/components/message-bubble.tsx) — там
// рисуется аватар собеседника, тут в этом нет смысла: собеседник всегда
// один из двух — либо "поддержка", либо "вы", подписи достаточно.
export const SupportMessageBubble = ({ message, isOwn, onDelete }: SupportMessageBubbleProps) => {
  // Корзина всегда с внешнего края (слева от своих сообщений, справа от
  // чужих) — рядом с центром, где сообщения обеих сторон сходятся, её было
  // бы легко случайно задеть.
  //
  // Всегда видима, не по ховеру — opacity-0/group-hover в принципе не
  // работает на тач-устройствах (там нет состояния hover), а именно
  // мобильный вид и оказался тем скриншотом, где админ не смог найти
  // кнопку удаления.
  const deleteButton = onDelete && (
    <button
      type='button'
      onClick={onDelete}
      aria-label='Удалить сообщение'
      className='mb-1 flex size-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500'
    >
      <Trash2 className='size-3.5' />
    </button>
  )

  return (
    <div className={cn('flex w-full items-end gap-1', isOwn ? 'justify-end' : 'justify-start')}>
      {isOwn && deleteButton}

      <div
        className={cn(
          'max-w-[80%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap',
          isOwn ? 'bg-primary/10' : 'bg-gray-100 text-gray-900'
        )}
      >
        {message.text}
        <div className='mt-1 text-right text-[11px] text-gray-400'>{formatMessageTime(message.createdAt)}</div>
      </div>

      {!isOwn && deleteButton}
    </div>
  )
}
