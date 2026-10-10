import { ActivityIndicator, Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'

import { Button } from '@/shared/components/button'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Check, Crown } from '@/shared/icons/lucide'
import { formatFullDate, isFutureDate } from '@/shared/utils/date'
import { openSitePage } from '@/shared/utils/open-site-page'

import { ProfileSectionScreen } from './profile-section-screen'

const PREMIUM_PRICE_LABEL = '1499 ₽ за 30 дней'
const PREMIUM_COLOR = '#ff6900'

// Те же пункты, что ContentPremium сайта.
const BENEFITS = [
  { title: 'До 15 фото к объявлению', description: 'Вместо 5 — покажите технику или животных со всех сторон' },
  {
    title: 'Выделенное объявление',
    description: 'Все ваши объявления автоматически подсвечиваются в каталоге и списках'
  },
  {
    title: 'Бейдж «Премиум»',
    description: 'Отмечает вас как надёжного продавца рядом с именем в объявлениях и профиле'
  },
  {
    title: 'Скидка на «Поднять объявление»',
    description: 'Дешевле поднимать объявления в поиске, пока активен премиум'
  },
  {
    title: 'Автоматический подъём объявлений',
    description: 'Объявления сами поднимаются в поиске — без ручных действий и доплат'
  }
] as const

// Оплата — на сайте (как и «Поднять объявление»): страница премиума
// открывается во встроенном браузере, после оплаты статус обновится при
// возвращении в приложение.
const openPremiumCheckout = () => void openSitePage('/profile/settings/premium')

// «Премиум Аккаунт» — как /profile/settings/premium сайта.
export function ProfilePremiumScreen() {
  const { data: profile, isPending, refetch } = useProfile()
  const primaryColor = useThemeColor('--color-primary')
  const premiumUntil = isFutureDate(profile?.premiumUntil) ? profile?.premiumUntil : null

  useRefetchOnFocus(refetch)

  return (
    <ProfileSectionScreen title='Премиум Аккаунт' onRefresh={refetch}>
      {isPending ? (
        <View className='items-center py-16'>
          <ActivityIndicator colorClassName='accent-primary' />
        </View>
      ) : premiumUntil ? (
        <View className='rounded-2xl bg-gray-100 p-8'>
          <View className='mb-1.5 flex-row items-center gap-2'>
            <Text className='text-base leading-tight font-medium text-gray-900'>Премиум активен</Text>
            <Crown size={20} color={PREMIUM_COLOR} fill={PREMIUM_COLOR} />
          </View>
          <Text className='mb-7 text-sm text-gray-900'>Действует до {formatFullDate(premiumUntil)}</Text>
          <Button title={`Продлить ещё на 30 дней — ${PREMIUM_PRICE_LABEL}`} size='sm' onPress={openPremiumCheckout} />
        </View>
      ) : (
        <View className='rounded-xl bg-gray-50 p-6'>
          <Text className='mb-4 text-2xl font-bold text-gray-900'>{PREMIUM_PRICE_LABEL}</Text>
          <View className='mb-6 gap-2'>
            {BENEFITS.map(benefit => (
              <View key={benefit.title} className='flex-row items-start gap-2'>
                <View className='mt-0.5'>
                  <Check size={16} color={primaryColor} strokeWidth={3} />
                </View>
                <View className='flex-1'>
                  <Text className='text-sm font-medium text-gray-700'>{benefit.title}</Text>
                  <Text className='text-sm text-gray-500'>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>
          <View className='self-start'>
            <Button title='Оформить премиум' variant='premium' onPress={openPremiumCheckout} />
          </View>
        </View>
      )}
    </ProfileSectionScreen>
  )
}
