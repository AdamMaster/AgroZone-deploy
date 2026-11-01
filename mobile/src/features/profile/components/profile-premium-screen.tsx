import { Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'

import { Button } from '@/shared/components/button'
import { QueryState } from '@/shared/components/query-state'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Check, Crown } from '@/shared/icons/lucide'
import { formatFullDate, isFutureDate } from '@/shared/utils/date'

import { usePremiumCheckout } from '../hooks/use-premium-checkout'
import { ProfileSectionScreen } from './profile-section-screen'

const PREMIUM_PRICE_LABEL = '1499 ₽ за 30 дней'
const PREMIUM_COLOR = '#fe9a00'

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
    title: 'Автоматический подъём объявлений',
    description: 'Объявления сами поднимаются в поиске — без ручных действий и доплат'
  }
] as const

// «Премиум Аккаунт» — как /profile/settings/premium сайта. Оплата идёт прямо
// из приложения: «Оформить» сразу открывает страницу оплаты ЮKassa, после
// оплаты пользователь возвращается сюда, а статус перепроверяется у сервера
// (usePremiumCheckout).
export function ProfilePremiumScreen() {
  const profileQuery = useProfile()
  const { data: profile, refetch } = profileQuery
  const primaryColor = useThemeColor('--color-primary')
  const premiumUntil = isFutureDate(profile?.premiumUntil) ? profile?.premiumUntil : null

  useRefetchOnFocus(refetch)

  const checkout = usePremiumCheckout()
  const openPremiumCheckout = () => checkout.mutate()

  return (
    <ProfileSectionScreen title='Премиум Аккаунт' onRefresh={refetch}>
      <QueryState query={profileQuery} errorTitle='Не удалось загрузить профиль'>
        {() =>
          premiumUntil ? (
            <View className='rounded-2xl bg-gray-100 p-8'>
              <View className='mb-1.5 flex-row items-center gap-2'>
                <Text className='text-base leading-tight font-medium text-gray-900'>Премиум активен</Text>
                <Crown size={20} color={PREMIUM_COLOR} fill={PREMIUM_COLOR} />
              </View>
              <Text className='mb-7 text-sm text-gray-900'>Действует до {formatFullDate(premiumUntil)}</Text>
              <Button
                title={`Продлить ещё на 30 дней — ${PREMIUM_PRICE_LABEL}`}
                size='sm'
                isLoading={checkout.isPending}
                onPress={openPremiumCheckout}
              />
            </View>
          ) : (
            <View className='rounded-xl bg-gray-50 p-4 sm:p-6'>
              <Text className='mb-4 text-lg font-bold text-gray-900 sm:text-2xl'>{PREMIUM_PRICE_LABEL}</Text>
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
                <Button
                  title='Оформить премиум'
                  variant='premium'
                  isLoading={checkout.isPending}
                  onPress={openPremiumCheckout}
                />
              </View>
            </View>
          )
        }
      </QueryState>
    </ProfileSectionScreen>
  )
}
