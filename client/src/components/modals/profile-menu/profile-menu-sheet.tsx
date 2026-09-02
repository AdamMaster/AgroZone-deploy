'use client'

import {
  Bell,
  Building2,
  Crown,
  FileText,
  Heart,
  HelpCircle,
  Info,
  Layers,
  Lock,
  MessageCircle,
  Shield,
  ShieldCheck,
  User
} from 'lucide-react'
import Link from 'next/link'

import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer'

import { cn } from '@/lib/utils'

interface ProfileMenuItem {
  label: string
  href: string
  icon: typeof Shield
}

const ACCOUNT_ITEMS: ProfileMenuItem[] = [
  { label: 'Личные данные', href: '/profile/settings/general', icon: User },
  { label: 'Безопасность', href: '/profile/settings/security', icon: Shield },
  { label: 'Мои объявления', href: '/profile/settings/ads', icon: Layers },
  { label: 'Сообщения', icon: MessageCircle, href: '/profile/settings/messages' },
  { label: 'Избранное', icon: Heart, href: '/profile/settings/favorites' },
  { label: 'Уведомления', icon: Bell, href: '/profile/settings/notifications' }
]

const PREMIUM_ITEM: ProfileMenuItem = { label: 'Премиум', href: '/profile/settings/premium', icon: Crown }

const INFO_ITEMS: ProfileMenuItem[] = [
  { label: 'Помощь', href: '/help', icon: HelpCircle },
  { label: 'Правила безопасности', href: '/safety', icon: ShieldCheck }
]

interface ProfileMenuSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ProfileMenuSheet = ({ open, onOpenChange }: ProfileMenuSheetProps) => {
  const close = () => onOpenChange(false)

  const renderItem = (item: ProfileMenuItem) => {
    const Icon = item.icon
    const isPremium = item.href === PREMIUM_ITEM.href

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
        className={cn(
          'flex items-center gap-3 rounded-lg px-4 py-3 text-gray-900 hover:bg-gray-50',
          isPremium && 'text-orange-500 hover:text-orange-600'
        )}
      >
        <Icon size={20} className={cn('text-gray-400', isPremium && 'text-orange-500')} />
        {item.label}
      </Link>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className='h-full'>
        <DrawerTitle className='sr-only'>Меню профиля</DrawerTitle>
        <div className='flex-1 overflow-y-auto p-2'>
          <div className='flex flex-col'>{ACCOUNT_ITEMS.map(renderItem)}</div>
          <div className='my-2 border-t border-gray-100' />
          <div className='flex flex-col'>{renderItem(PREMIUM_ITEM)}</div>
          <div className='my-2 border-t border-gray-100' />
          <div className='flex flex-col'>{INFO_ITEMS.map(renderItem)}</div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
