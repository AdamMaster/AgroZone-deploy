'use client'

import { LogOut, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { OwnSellerRating } from '@/components/features/sellers/components/own-seller-rating'
import { useSiteFlags } from '@/components/features/site-settings/hooks'
import { Skeleton } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { IUser } from '../../auth/types'
import { useLogoutMutation } from '../hooks'
import { UserAvatar } from './user-avatar'

interface UserButtonProps {
  className?: string
  user: IUser
}

export const UserButton = ({ className, user }: UserButtonProps) => {
  const { logout, isLoadingLogout } = useLogoutMutation()
  const router = useRouter()
  const { sellerRatings } = useSiteFlags()

  if (!user) return null

  const onPersonalDataClick = () => {
    router.push('/profile/settings/general')
  }

  const onSecurityClick = () => {
    router.push('/profile/settings/security')
  }

  const onMyAdsClick = () => {
    router.push('/profile/settings/ads')
  }

  const onMessagesClick = () => {
    router.push('/profile/settings/messages')
  }

  const onMyFavoritesClick = () => {
    router.push('/profile/settings/favorites')
  }

  const onPersonalizationClick = () => {
    router.push('/profile/settings/personalization')
  }

  const list = [
    { id: 'general', text: 'Личные данные', onClick: () => onPersonalDataClick() },
    { id: 'security', text: 'Безопасность', onClick: () => onSecurityClick() },
    { id: 'ads', text: 'Мои объявления', onClick: () => onMyAdsClick() },
    { id: 'messages', text: 'Сообщения', onClick: () => onMessagesClick() },
    { id: 'favorites', text: 'Избранное', onClick: () => onMyFavoritesClick() },
    { id: 'personalization', text: 'Персонализация', onClick: () => onPersonalizationClick() }
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label='Меню профиля' className={className}>
        <UserAvatar user={user} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={sellerRatings && user.rating ? 'w-56' : 'w-40'} align='end'>
        {sellerRatings && user.rating && (
          <>
            <div className='px-2 py-1.5'>
              <OwnSellerRating userId={user.id} rating={user.rating} />
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {list.map(item => (
          <DropdownMenuItem disabled={isLoadingLogout} onClick={item.onClick} key={item.id}>
            {item.text}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem disabled={isLoadingLogout} onClick={() => logout()} className='text-gray-500'>
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function UserButtonLoading() {
  return <Skeleton className='h-8 w-8 rounded-full' />
}
