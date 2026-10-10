import { Fragment, memo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { AD_BADGE_LABELS } from '@/features/ads/constants/ad-badges'

import { AdPhoto } from '@/shared/components/ad-photo'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { CircleAlert, Crown, ImageIcon, SquarePen } from '@/shared/icons/lucide'
import { formatDayMonth, formatRelativeDay, isFutureDate } from '@/shared/utils/date'
import { formatPriceWithUnit } from '@/shared/utils/format-price'

import type { MyAd } from '../types/my-ad.types'

interface MyAdCardProps {
  ad: MyAd
  // Премиум владельца сам поднимает объявления и выделяет цену.
  isOwnerPremium: boolean
  onOpen: (ad: MyAd) => void
  onEdit: (ad: MyAd) => void
}

// Пояснения — те же тексты, что во всплывающих подсказках сайта. На
// телефоне наведения нет, поэтому показываем их по нажатию.
const HINTS = {
  pending:
    'Мы проверяем объявление на соответствие правилам площадки. Обычно модерация занимает около 15 минут, но в отдельных случаях может занять до 24 часов.',
  premium:
    'Премиум-аккаунт сам поднимает все ваши объявления в топ каждый день и выделяет цену — эти услуги можно не покупать, только значок премиум не заменяет.'
} as const

type HintKey = keyof typeof HINTS | 'rejected'

// Строка «Моих объявлений» — как AdShortCard сайта на телефоне: фото 88×80,
// название, статус, цена, адрес, карандаш «Редактировать» и строка с
// платными услугами под ней.
export const MyAdCard = memo(function MyAdCard({ ad, isOwnerPremium, onOpen, onEdit }: MyAdCardProps) {
  const [hint, setHint] = useState<HintKey | null>(null)
  const iconColor = useThemeColor('--color-gray-950')
  const placeholderIconColor = useThemeColor('--color-gray-400')
  const coverUrl = ad.images[0]
  const editLabel = ad.status === 'REJECTED' ? 'Исправить' : 'Редактировать'

  const toggleHint = (key: HintKey) => setHint(current => (current === key ? null : key))
  const hintText = hint === 'rejected' ? ad.rejectionReason : hint ? HINTS[hint] : null

  const services = [
    isFutureDate(ad.bumpServiceUntil) && `Поднятие активно до ${formatDayMonth(ad.bumpServiceUntil!)}`,
    ad.bumpedAt && `Поднято ${formatRelativeDay(ad.bumpedAt)}`,
    isFutureDate(ad.priceHighlightUntil) && `Цена выделена до ${formatDayMonth(ad.priceHighlightUntil!)}`,
    ad.badge &&
      isFutureDate(ad.badgeUntil) &&
      `Значок «${AD_BADGE_LABELS[ad.badge]}» до ${formatDayMonth(ad.badgeUntil!)}`
  ].filter((item): item is string => Boolean(item))

  return (
    <View>
      <View className='flex-row gap-2.5'>
        <Pressable
          accessibilityRole='link'
          accessibilityLabel={ad.title}
          onPress={() => onOpen(ad)}
          className='h-20 w-22 items-center justify-center overflow-hidden rounded-lg bg-slate-100'
        >
          {coverUrl ? (
            <AdPhoto url={coverUrl} size={400} className='size-full' contentFit='cover' recyclingKey={ad.id} />
          ) : (
            <ImageIcon size={32} color={placeholderIconColor} />
          )}
        </Pressable>

        <View className='flex-1'>
          {ad.status === 'PENDING' && (
            <Pressable onPress={() => toggleHint('pending')} className='mb-1 self-start' hitSlop={4}>
              <Text className='rounded-2xl bg-orange-200 px-2 py-0.5 text-xs text-neutral-900'>На модерации</Text>
            </Pressable>
          )}
          <View className='flex-row items-center gap-2'>
            <Pressable onPress={() => onOpen(ad)} className='shrink'>
              <Text className='text-base leading-tight text-gray-900'>{ad.title}</Text>
            </Pressable>
            {ad.status === 'REJECTED' && ad.rejectionReason && (
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Причина отклонения'
                onPress={() => toggleHint('rejected')}
                hitSlop={8}
              >
                <CircleAlert size={16} color='#f59e0b' />
              </Pressable>
            )}
          </View>
          {ad.status === 'EXPIRED' && (
            <Text className='self-start rounded-2xl bg-orange-200 px-2 py-0.5 text-xs text-neutral-900'>
              Срок действия истек
            </Text>
          )}
          <Text className='text-base font-bold text-gray-950'>{formatPriceWithUnit(ad.price, ad.unit)}</Text>
          <Text className='text-[13px] text-gray-500'>{ad.address}</Text>
        </View>

        <Pressable accessibilityRole='button' accessibilityLabel={editLabel} onPress={() => onEdit(ad)} hitSlop={8}>
          <SquarePen size={20} color={iconColor} />
        </Pressable>
      </View>

      {hintText && (
        <Pressable onPress={() => setHint(null)} className='mt-2 rounded-md bg-gray-900 px-3 py-2 dark:bg-gray-200'>
          <Text className='text-xs leading-snug text-white dark:text-gray-950'>{hintText}</Text>
        </Pressable>
      )}

      {(isOwnerPremium || services.length > 0) && (
        <View className='mt-2 flex-row flex-wrap items-center gap-x-2 gap-y-1'>
          {isOwnerPremium && (
            <Pressable onPress={() => toggleHint('premium')} className='flex-row items-center gap-1'>
              <Crown size={12} color='#ea580c' />
              <Text className='text-[11px] font-medium text-orange-600'>
                Поднятие и выделение цены уже включены премиумом
              </Text>
            </Pressable>
          )}
          {services.map((service, index) => (
            <Fragment key={service}>
              {(isOwnerPremium || index > 0) && <Text className='text-[11px] text-gray-400'>-</Text>}
              <Text className='text-[11px] text-gray-500'>{service}</Text>
            </Fragment>
          ))}
        </View>
      )}
    </View>
  )
})

// Заглушка строки на время загрузки — как AdShortCardSkeleton сайта.
export function MyAdCardSkeleton() {
  return (
    <View className='flex-row gap-2.5'>
      <View className='h-20 w-22 rounded-lg bg-gray-100' />
      <View className='flex-1 gap-2'>
        <View className='h-4 w-4/5 rounded-md bg-gray-100' />
        <View className='h-4 w-1/3 rounded-md bg-gray-100' />
      </View>
    </View>
  )
}
