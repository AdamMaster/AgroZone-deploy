import { ArrowLeft, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui'
import { UserAvatar } from '@/components/features/user/components'

import { cn } from '@/lib/utils'

interface ChatHeaderAd {
  // null — объявление физически удалено, title в этом случае уже снепшот
  // (см. IMessageAd).
  id: string | null
  title: string
  images: string[]
}

interface ChatHeaderCounterpart {
  id: string
  displayName?: string | null
  picture?: string | null
  deletedAt?: string | null
}

interface ChatHeaderProps {
  ad?: ChatHeaderAd
  counterpart?: ChatHeaderCounterpart
  isLoading?: boolean
  onBack?: () => void
}

export const ChatHeader = ({ ad, counterpart, isLoading, onBack }: ChatHeaderProps) => {
  return (
    <div className='flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-3'>
      {onBack && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onBack}
          aria-label='Назад к диалогам'
          className='size-10'
        >
          <ArrowLeft className='size-5' />
        </Button>
      )}
      <UserAvatar user={counterpart ?? { id: '', displayName: null, picture: null }} />
      <div className='min-w-0 flex-1'>
        <p className={cn('truncate text-sm font-medium', counterpart?.deletedAt && 'text-gray-400 italic')}>
          {counterpart?.deletedAt
            ? 'Пользователь удалил аккаунт'
            : (counterpart?.displayName ?? (isLoading ? 'Загрузка...' : 'Пользователь'))}
        </p>
        {ad &&
          (ad.id ? (
            <Link
              href={`/ads/${ad.id}`}
              className='hover:text-primary flex items-center gap-1.5 truncate text-xs text-gray-500'
            >
              {ad.images?.[0] ? (
                <span className='relative size-4 shrink-0 overflow-hidden rounded'>
                  <Image src={ad.images[0]} alt={ad.title} fill sizes='16px' className='object-cover' />
                </span>
              ) : (
                <ImageIcon className='size-3.5 shrink-0' />
              )}
              <span className='truncate'>{ad.title}</span>
            </Link>
          ) : (
            // Объявление удалено физически — просто текст, без ссылки в никуда.
            <span className='flex items-center gap-1.5 truncate text-xs text-gray-400'>
              <ImageIcon className='size-3.5 shrink-0' />
              <span className='truncate'>{ad.title}</span>
            </span>
          ))}
      </div>
    </div>
  )
}
