'use client'

import { Bell, Ellipsis, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

import { CategoryMenuButton } from '@/components/features/categories/components'
import { HomeLocationPicker } from '@/components/features/home/components'
import { useUnreadNotificationsCount } from '@/components/features/notifications/hooks'
import { SearchBar } from '@/components/features/search/components'
import { ProfileMenuSheet } from '@/components/modals/profile-menu'
import { Logo } from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { useProfile } from '@/shared/hooks'

import { cn } from '@/lib/utils'

import { Container } from '../container'
import { HeaderActions } from './header-actions'

export const Header = () => {
  const pathname = usePathname()
  const router = useRouter()
  const isMessagesPage = pathname.startsWith('/profile/settings/messages')
  const isAdsPage = pathname.startsWith('/ads/')
  const isAdFormPage = isAdsPage && (pathname === '/ads/create' || pathname.endsWith('/edit'))
  const isAdDetailPage = isAdsPage && !isAdFormPage && !pathname.endsWith('/promote')
  const isProfileSection = pathname.startsWith('/profile/') && !isMessagesPage && !isAdsPage
  const showCompactHeader = isProfileSection || isMessagesPage || isAdsPage
  const { user } = useProfile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header
      className={cn(
        'relative bg-white py-3 md:pt-0 md:pb-2 dark:bg-transparent',
        showCompactHeader ? 'absolute z-10 w-full bg-transparent sm:relative sm:bg-white' : 'relative'
      )}
    >
      <div className='hidden md:block'>
        <Container>
          <div className='flex h-14 items-center justify-between gap-6 py-4'>
            <Logo className='block lg:hidden' />
            <p className='text-secondary hidden text-sm leading-3 lg:inline dark:text-neutral-200'>
              Агропромышленная торговая площадка
            </p>
            <HeaderActions className='ml-auto' />
          </div>
        </Container>
      </div>
      <div>
        <Container>
          <div className='flex items-center gap-3 md:gap-10'>
            <Logo className='hidden lg:block' />
            <div className='flex w-full items-center gap-2'>
              <div className='hidden md:block'>
                <CategoryMenuButton />
              </div>
              {isProfileSection ? (
                <div className='flex w-full items-center justify-end gap-4 md:hidden'>
                  <Link href='/profile/settings/notifications' className='relative inline-flex'>
                    <Bell className='size-6 text-gray-700' />
                    {user && <ProfileHeaderBellBadge />}
                  </Link>
                  <button type='button' onClick={() => setIsMenuOpen(true)} aria-label='Меню профиля'>
                    <Menu className='size-6 text-gray-700' />
                  </button>
                </div>
              ) : isMessagesPage ? (
                <div className='flex w-full items-center justify-end gap-4 md:hidden'>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className='flex size-9 items-center justify-center rounded-lg hover:bg-gray-100'
                      aria-label='Ещё'
                    >
                      <Ellipsis className='size-5 text-gray-700' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      <DropdownMenuItem onClick={() => router.push('/profile/settings/blocked')}>
                        Черный список
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : isAdFormPage || isAdDetailPage ? null : (
                <SearchBar className={cn('grow', showCompactHeader && 'md:hidden')} />
              )}
              {showCompactHeader && (
                <div className='hidden md:block md:grow'>
                  <SearchBar className='grow' />
                </div>
              )}
              <div className='ml-4 hidden md:block lg:ml-8'>
                <HomeLocationPicker />
              </div>
            </div>
          </div>
        </Container>
      </div>
      {isProfileSection && <ProfileMenuSheet open={isMenuOpen} onOpenChange={setIsMenuOpen} />}
    </header>
  )
}

const ProfileHeaderBellBadge = () => {
  const { unreadCount } = useUnreadNotificationsCount()

  if (unreadCount <= 0) return null

  return (
    <span className='bg-primary absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white'>
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )
}
