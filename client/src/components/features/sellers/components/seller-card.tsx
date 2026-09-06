import { Crown } from 'lucide-react'

import { UserType } from '@/components/features/auth/types'
import { UserAvatar } from '@/components/features/user/components'
import { Heading } from '@/components/ui'

import { USER_TYPE_LABELS } from '@/shared/constants/user-types'
import { isPremiumActive, pluralizeRu } from '@/shared/utils'

import { IPublicSeller } from '../types/seller.types'

interface SellerCardProps {
  seller: IPublicSeller
}

const formatJoinDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(value))

export function SellerCard({ seller }: SellerCardProps) {
  const isBusinessVerified = seller.type !== UserType.Individual && !!seller.businessVerifiedAt && !!seller.businessName
  const isSellerPremium = isPremiumActive(seller.premiumUntil)

  return (
    <div className='flex justify-between gap-4 text-center text-left sm:flex-col sm:items-start'>
      <UserAvatar user={seller} className='order-1 size-16 sm:order-0 sm:size-24' />

      <div>
        <Heading level={1} className='text-xl sm:text-lg md:text-lg'>
          {seller.displayName ?? 'Пользователь'}
        </Heading>

        <div className='mt-2 flex flex-wrap justify-start gap-2'>
          {seller.type === UserType.Individual && (
            <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>
              {USER_TYPE_LABELS[seller.type]}
            </span>
          )}
          {isBusinessVerified && (
            <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>{seller.businessName}</span>
          )}
          {isSellerPremium && (
            <span className='flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700'>
              <Crown size={11} />
              Премиум
            </span>
          )}
        </div>

        <div className='w-full space-y-1 pt-4 text-sm text-gray-500'>
          <p>На сайте с {formatJoinDate(seller.createdAt)}</p>
          <p>
            {seller.adsCount} {pluralizeRu(seller.adsCount, ['объявление', 'объявления', 'объявлений'])}
          </p>
        </div>
      </div>
    </div>
  )
}
