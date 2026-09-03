import { X } from 'lucide-react'
import { type PropsWithChildren } from 'react'

import { Button } from '@/components/ui'

interface SupportChatPanelProps extends PropsWithChildren {
  onClose: () => void
}

// На мобилке — во весь экран (общаться в чате поддержки в узкой плашке в
// углу неудобно), на sm+ — карточка фиксированного размера над кнопкой
// (см. support-chat-button.tsx — те же правые/нижние отступы, чтобы панель
// не перекрывала саму кнопку). Чисто CSS-переключение по брейкпоинту, без
// useMediaQuery — тот же подход, что и у MobileTabBar (md:hidden).
//
// Полноэкранная мобильная версия перекрывает саму плавающую кнопку (та же
// area, z-50 у обеих) — без отдельного крестика тут не было бы способа
// закрыть чат на мобилке. На sm+ кнопка остаётся видна снаружи панели
// (sm:bottom-24 у панели против sm:bottom-6 у кнопки), поэтому там крестик
// в шапке скрыт — второй способ закрыть то же самое действие не нужен.
export const SupportChatPanel = ({ onClose, children }: SupportChatPanelProps) => {
  return (
    <div className='fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border sm:border-gray-100 dark:bg-neutral-800'>
      <div className='flex items-center justify-end border-b border-gray-100 px-1 py-1 sm:hidden'>
        <Button type='button' variant='ghost' size='icon' onClick={onClose} aria-label='Закрыть чат поддержки'>
          <X className='size-5' />
        </Button>
      </div>
      <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
    </div>
  )
}
