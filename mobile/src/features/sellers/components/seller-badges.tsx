import { Text, View } from 'react-native'

import type { SellerType } from '@/shared/constants/seller-types'
import { SELLER_TYPE_LABELS } from '@/shared/constants/seller-types'
import { Crown } from '@/shared/icons/lucide'
import { isFutureDate } from '@/shared/utils/date'

interface SellerBadgesProps {
  seller: {
    type: SellerType
    businessName: string | null
    businessVerifiedAt: string | null
    premiumUntil: string | null
  }
  // Отступы снаружи — у блока в объявлении и у карточки продавца они разные.
  className?: string
}

// Чипы продавца — тип («Частное лицо»), подтверждённое по ИНН название
// ИП/компании и «Премиум»: одни и те же в блоке продавца объявления и в
// карточке продавца.
export function SellerBadges({ seller, className = '' }: SellerBadgesProps) {
  // Название ИП/компании показываем, только если продавец подтвердил его по
  // ИНН; частное лицо — подписью типа.
  const businessName = seller.type !== 'INDIVIDUAL' && seller.businessVerifiedAt ? seller.businessName : null
  const typeLabel = seller.type === 'INDIVIDUAL' ? SELLER_TYPE_LABELS.INDIVIDUAL : businessName
  const isPremium = isFutureDate(seller.premiumUntil)

  if (!typeLabel && !isPremium) return null

  return (
    <View className={`flex-row flex-wrap gap-2 ${className}`}>
      {typeLabel && <Text className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>{typeLabel}</Text>}
      {isPremium && (
        <View className='flex-row items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1'>
          <Crown size={11} color='#b45309' />
          <Text className='text-xs text-amber-700'>Премиум</Text>
        </View>
      )}
    </View>
  )
}
