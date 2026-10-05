'use client'

import { Headset, MessageCircle, X } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SupportChatButtonProps {
  isOpen: boolean
  hasUnread: boolean
  // Скрыть кнопку там, где виден MobileTabBar (<md) — см. SupportChatWidget.
  isHiddenOnMobile: boolean
  onClick: () => void
}

// bottom смещён на мобилке — иначе кнопка легла бы поверх MobileTabBar
// (см. components/layout/mobile-tab-bar — там же safe-area-inset-bottom,
// повторяем тот же отступ).
export const SupportChatButton = ({ isOpen, hasUnread, isHiddenOnMobile, onClick }: SupportChatButtonProps) => {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={isOpen ? 'Закрыть чат поддержки' : 'Открыть чат поддержки'}
      className={cn(
        'bg-primary fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex size-13 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6',
        isHiddenOnMobile && 'max-md:hidden'
      )}
    >
      {isOpen ? <X className='size-6' /> : <Headset className='size-6' />}

      {!isOpen && hasUnread && (
        <span className='absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-red-500' />
      )}
    </button>
  )
}
