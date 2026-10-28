import { useState } from 'react'
import { Text, View } from 'react-native'

import { useAdNavigation } from '@/features/ads/hooks/use-ad-navigation'
import { ReviewDialog } from '@/features/sellers/components/review-dialog'
import { useSiteFlags } from '@/features/site-settings/hooks/use-site-flags'

import { Button } from '@/shared/components/button'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { CircleCheck } from '@/shared/icons/lucide'
import { formatDayMonth } from '@/shared/utils/date'

import { useSetDeal } from '../hooks/use-conversations'
import type { ConversationListItem } from '../types/message.types'

interface DealBannerProps {
  conversation: Pick<ConversationListItem, 'id' | 'isSeller' | 'canConfirmDeal' | 'dealConfirmedAt' | 'counterpart'>
}

// Отметка «сделка состоялась» под шапкой переписки — как DealBar сайта.
// Ставит её только продавец, и только после своего ответа покупателю (см.
// canConfirmDeal); покупатель видит результат и, когда рейтинги продавцов
// включены в админке, кнопку «Оставить отзыв» — иначе обещать отзыв нечем.
export function DealBanner({ conversation }: DealBannerProps) {
  const { id, isSeller, canConfirmDeal, dealConfirmedAt, counterpart } = conversation
  const { sellerRatings } = useSiteFlags()
  const { mutate: setDeal, isPending } = useSetDeal(id)
  const primaryColor = useThemeColor('--color-primary')
  const { openSeller } = useAdNavigation()
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  if (dealConfirmedAt) {
    return (
      <View className='mt-2 flex-row items-center gap-3 rounded-lg bg-gray-100 px-3 py-2'>
        <CircleCheck size={20} color={primaryColor} />
        <View className='min-w-0 flex-1'>
          <Text className='text-sm text-gray-900'>
            {isSeller ? 'Вы отметили сделку состоявшейся' : 'Продавец отметил сделку состоявшейся'}
          </Text>
          <Text className='text-xs text-gray-500'>{formatDayMonth(dealConfirmedAt)}</Text>
        </View>
        {isSeller && (
          <Button title='Отменить' variant='outline' size='sm' isLoading={isPending} onPress={() => setDeal(false)} />
        )}
        {!isSeller && sellerRatings && (
          <>
            <Button title='Оставить отзыв' size='sm' onPress={() => setIsReviewOpen(true)} />
            <ReviewDialog
              sellerId={counterpart.id}
              visible={isReviewOpen}
              onClose={() => setIsReviewOpen(false)}
              onOpenSellerReviews={() => openSeller(counterpart.id, 'reviews')}
            />
          </>
        )}
      </View>
    )
  }

  // Кнопка появляется, когда продавец сам ответил покупателю.
  if (!isSeller || !canConfirmDeal) return null

  return (
    <View className='mt-2 flex-row items-center gap-3 rounded-lg bg-gray-100 px-3 py-2'>
      <Text className='min-w-0 flex-1 text-sm text-gray-900'>Сделка с этим покупателем состоялась?</Text>
      <Button title='Сделка состоялась' size='sm' isLoading={isPending} onPress={() => setDeal(true)} />
    </View>
  )
}
