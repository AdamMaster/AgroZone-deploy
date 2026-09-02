'use client'

import { Bell, Building2, Crown, Heart, Layers, MessageCircle, Palette, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

import { useConversations } from '../../messages/hooks'

const items = [
  { label: 'Личные данные', icon: User, id: 'general', href: '/profile/settings/general' },
  { label: 'Безопасность', icon: Shield, id: 'security', href: '/profile/settings/security' },
  { label: 'Мои объявления', icon: Layers, id: 'ads', href: '/profile/settings/ads' },
  { label: 'Сообщения', icon: MessageCircle, id: 'messages', href: '/profile/settings/messages' },
  { label: 'Избранное', icon: Heart, id: 'favorites', href: '/profile/settings/favorites' },
  { label: 'Уведомления', icon: Bell, id: 'notifications', href: '/profile/settings/notifications' },
  { label: 'Персонализация', icon: Palette, id: 'personalization', href: '/profile/settings/personalization' },
  { label: 'Премиум', icon: Crown, id: 'premium', href: '/profile/settings/premium' }
]

export const SettingsNav = () => {
  const pathname = usePathname()
  const { conversations } = useConversations()
  const unreadCount = conversations.filter(item => item.isUnread).length

  return (
    <nav>
      <ul className='flex flex-col'>
        {items.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-gray-900 hover:bg-gray-50',
                  isActive && 'bg-gray-100',
                  item.id === 'premium' && 'text-orange-500 hover:text-orange-600'
                )}
              >
                <Icon
                  size={18}
                  className={cn(
                    'text-gray-400',
                    item.id === 'premium' && 'text-orange-500',
                    isActive && 'text-inherit'
                  )}
                />
                {item.label}
                {item.id === 'messages' && unreadCount > 0 && (
                  <span className='bg-primary ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] text-white'>
                    {unreadCount}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
