'use client'

import { useAppModal } from '@/store'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { JSX, MouseEvent, SVGProps } from 'react'

import { useUnreadNotificationsCount } from '@/components/features/notifications/hooks'
import {
  ChatCircleFillIcon,
  HeartFillIcon,
  HouseFillIcon,
  StackFillIcon,
  UserFillIcon
} from '@/components/icons/phosphor-fill-icons'

import { useProfile } from '@/shared/hooks'

import { cn } from '@/lib/utils'

interface TabItem {
  label: string
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element
  href: string
  // Требует авторизации — гостя вместо перехода отправляем в модалку
  // входа (см. handleClick). Раньше проверка "есть ли user" была
  // общей для всех вкладок, из-за чего гостю модалка логина открывалась
  // даже по тапу на "Главная" вместо перехода на /.
  requiresAuth?: boolean
}

const PROFILE_HREF = '/profile/settings/general'

const TABS: TabItem[] = [
  { label: 'Главная', icon: HouseFillIcon, href: '/' },
  { label: 'Избранное', icon: HeartFillIcon, href: '/profile/settings/favorites', requiresAuth: true },
  { label: 'Объявления', icon: StackFillIcon, href: '/profile/settings/ads', requiresAuth: true },
  { label: 'Сообщения', icon: ChatCircleFillIcon, href: '/profile/settings/messages', requiresAuth: true },
  { label: 'Профиль', icon: UserFillIcon, href: PROFILE_HREF, requiresAuth: true }
]

const ProfileTabBadge = () => {
  const { unreadCount } = useUnreadNotificationsCount()

  if (unreadCount <= 0) return null

  return (
    <span className='bg-primary absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white'>
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )
}

export const MobileTabBar = () => {
  const pathname = usePathname()
  const { user } = useProfile()
  const { onOpen } = useAppModal()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, tab: TabItem) => {
    if (!tab.requiresAuth || user) return

    event.preventDefault()
    // U1 в ROADMAP.md: раньше просто открывали модалку входа и оставляли
    // гостя там же — после входа ему приходилось ещё раз тыкать по той же
    // вкладке. Теперь модалка знает, куда его вести дальше.
    onOpen('login', { returnTo: tab.href })
  }

  return (
    <nav
      className='fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:bg-neutral-800'
      aria-label='Основная навигация'
    >
      {TABS.map(tab => {
        const Icon = tab.icon
        const isActive = tab.href === PROFILE_HREF ? pathname.startsWith('/profile/settings') : pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={event => handleClick(event, tab)}
            className={cn(
              'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-gray-500',
              isActive && 'dark:text-primary text-gray-950'
            )}
          >
            <span className='relative inline-flex'>
              <Icon className={cn('size-5', isActive ? 'dark:text-primary text-gray-950' : 'text-gray-500')} />
              {tab.href === PROFILE_HREF && user && <ProfileTabBadge />}
            </span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
