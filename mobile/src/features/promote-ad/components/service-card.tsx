import { Pressable, Text, View } from 'react-native'
import { toast } from 'sonner-native'

import { AD_BADGE_LABELS, AD_BADGE_LIST } from '@/features/ads/constants/ad-badges'
import type { AdBadge } from '@/features/ads/types/ad.types'

import { Switch } from '@/shared/components/switch'
import { Crown } from '@/shared/icons/lucide'
import { formatDayMonth, isFutureDate } from '@/shared/utils/date'
import { formatRubles } from '@/shared/utils/format-price'

import { AD_SERVICE_DESCRIPTIONS, AD_SERVICE_LABELS, AD_SERVICE_PRICES_KOPECKS } from '../constants/ad-services'
import type { AdServiceType } from '../types/promote-ad.types'

// Цвет значка «Включено в премиум» — amber-700 Tailwind, как text-amber-700 рядом.
const PREMIUM_CHIP_ICON_COLOR = '#b45309'

const INCLUDED_IN_PREMIUM_HINT =
  'Премиум-аккаунт уже включает эту услугу для всех ваших объявлений — покупать отдельно не нужно.'

interface ServiceCardProps {
  service: AdServiceType
  isChecked: boolean
  // Услуга входит в активный премиум продавца: включить её нельзя.
  isIncludedInPremium: boolean
  // До какого дня услуга уже оплачена (если ещё действует).
  activeUntil: string | null
  // Текущий значок объявления — только для услуги «значок».
  activeBadge: AdBadge | null
  selectedBadge: AdBadge | undefined
  onToggle: () => void
  onSelectBadge: (badge: AdBadge) => void
}

// Карточка одной услуги — как карточка на странице «Поднять просмотры»
// сайта: название и описание, цена, переключатель; у значка при включении
// ниже выбор значка.
export function ServiceCard({
  service,
  isChecked,
  isIncludedInPremium,
  activeUntil,
  activeBadge,
  selectedBadge,
  onToggle,
  onSelectBadge
}: ServiceCardProps) {
  const isActive = isFutureDate(activeUntil)

  return (
    <View className='rounded-xl bg-white p-4 shadow-md dark:bg-neutral-700/80'>
      <View className='flex-col flex-wrap justify-between gap-4 sm:flex-row sm:items-center'>
        <View className='flex-1'>
          <Text className='text-base font-medium text-gray-900'>{AD_SERVICE_LABELS[service]}</Text>
          <Text className='text-sm text-gray-500'>{AD_SERVICE_DESCRIPTIONS[service]}</Text>
          {service === 'BADGE' && isActive && activeBadge && (
            <Text className='mt-1 text-xs text-amber-600'>
              Сейчас активен: {AD_BADGE_LABELS[activeBadge]} — до {formatDayMonth(activeUntil as string)}
            </Text>
          )}
          {service !== 'BADGE' && isActive && (
            <Text className='mt-1 text-xs text-amber-600'>Уже активно до {formatDayMonth(activeUntil as string)}</Text>
          )}
        </View>

        <View className='shrink-0 flex-row items-center gap-3'>
          <Text className='text-sm font-medium text-gray-900'>
            {formatRubles(AD_SERVICE_PRICES_KOPECKS[service] / 100)}
          </Text>
          {isIncludedInPremium ? (
            // Подсказка при нажатии: на телефоне нет наведения, как у Tooltip сайта.
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Включено в премиум'
              onPress={() => toast.info(INCLUDED_IN_PREMIUM_HINT)}
              className='flex-row items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1'
            >
              <Crown size={14} color={PREMIUM_CHIP_ICON_COLOR} />
              <Text className='text-xs font-medium text-amber-700'>Включено в премиум</Text>
            </Pressable>
          ) : (
            <Switch value={isChecked} onValueChange={onToggle} accessibilityLabel={AD_SERVICE_LABELS[service]} />
          )}
        </View>
      </View>

      {service === 'BADGE' && isChecked && (
        <View className='mt-4 flex-row flex-wrap gap-2 border-t border-border pt-4'>
          {AD_BADGE_LIST.map(badge => {
            const isSelected = selectedBadge === badge

            return (
              <Pressable
                key={badge}
                accessibilityRole='button'
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectBadge(badge)}
                className={`rounded-full px-3 py-1.5 ${isSelected ? 'bg-secondary' : 'bg-gray-100'}`}
              >
                <Text className={`text-sm ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                  {AD_BADGE_LABELS[badge]}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}
