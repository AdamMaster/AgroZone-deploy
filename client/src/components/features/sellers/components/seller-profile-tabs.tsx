'use client'

import { useSearchParams } from 'next/navigation'

import { IAdsListResponse } from '@/components/features/ads/types/ad.types'
import { useSiteFlags } from '@/components/features/site-settings/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

import { ISellerRating } from '../types'
import { SellerProfileContent } from './seller-profile-content'
import { SellerReviews } from './seller-reviews'

const TAB_ADS = 'ads'
const TAB_REVIEWS = 'reviews'

interface SellerProfileTabsProps {
  sellerId: string
  initialAds: IAdsListResponse
  rating?: ISellerRating
}

// Правая колонка страницы продавца. Пока рейтинги выключены в админке —
// ровно прежний список объявлений, без вкладок. Когда включены — вкладки
// «Объявления» и «Отзывы»; открытую вкладку держим в адресе (?tab=reviews),
// чтобы на неё можно было сослаться (так ведут уведомления об отзывах).
export const SellerProfileTabs = ({ sellerId, initialAds, rating }: SellerProfileTabsProps) => {
  const { sellerRatings } = useSiteFlags()
  const searchParams = useSearchParams()
  // Вкладка целиком определяется адресом: так на неё работают и ссылки
  // (?tab=reviews из уведомлений и из блока рейтинга), и переключение.
  const tab = searchParams.get('tab') === TAB_REVIEWS ? TAB_REVIEWS : TAB_ADS

  if (!sellerRatings) {
    return <SellerProfileContent sellerId={sellerId} initialAds={initialAds} />
  }

  // history.replaceState, а не router.replace: смена вкладки не должна заново
  // рендерить страницу на сервере. Next.js (14.1+) подхватывает такой адрес в useSearchParams сам.
  const changeTab = (value: string) => {
    const url = new URL(window.location.href)

    if (value === TAB_REVIEWS) url.searchParams.set('tab', TAB_REVIEWS)
    else url.searchParams.delete('tab')

    window.history.replaceState(null, '', url)
  }

  return (
    <Tabs value={tab} onValueChange={changeTab}>
      <TabsList variant='line' className='mb-4 w-full justify-start gap-4 border-b'>
        <TabsTrigger value={TAB_ADS} className='flex-none px-2'>
          Объявления
        </TabsTrigger>
        <TabsTrigger value={TAB_REVIEWS} className='flex-none px-2'>
          Отзывы{rating && rating.count > 0 ? ` · ${rating.count}` : ''}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={TAB_ADS}>
        <SellerProfileContent sellerId={sellerId} initialAds={initialAds} />
      </TabsContent>
      <TabsContent value={TAB_REVIEWS}>
        <SellerReviews sellerId={sellerId} />
      </TabsContent>
    </Tabs>
  )
}
