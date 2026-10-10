import { Linking, Pressable, Text, View } from 'react-native'
import { toast } from 'sonner-native'

import { useRevealPhone } from '@/features/ads/hooks/use-ad-detail'
import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useAuthStore } from '@/features/auth/store/auth-store'

import { formatPhoneInput } from '@/shared/utils/phone'

interface AdContactButtonsProps {
  adId: string
}

// «Показать телефон» и «Написать» — как у сайта. Номер выдаётся только
// вошедшим; показанный номер — ссылка «позвонить».
export function AdContactButtons({ adId }: AdContactButtonsProps) {
  const requestSignIn = useRequestSignIn()
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')
  const revealPhone = useRevealPhone()
  const phone = revealPhone.data?.phone

  const handlePhonePress = () => {
    if (phone) {
      void Linking.openURL(`tel:+${phone}`)
      return
    }

    if (!isSignedIn) {
      requestSignIn()
      return
    }

    revealPhone.mutate(adId)
  }

  // Чат — отдельный этап; до него честно говорим об этом.
  const handleWritePress = () => {
    if (!isSignedIn) {
      requestSignIn()
      return
    }

    toast.info('Сообщения появятся в следующем обновлении приложения')
  }

  const phoneTitle = phone
    ? formatPhoneInput(`+${phone}`)
    : revealPhone.isPending
      ? 'Показ номера…'
      : 'Показать телефон'

  return (
    <View className='flex-row gap-1.5'>
      <Pressable
        accessibilityRole={phone ? 'link' : 'button'}
        accessibilityState={{ busy: revealPhone.isPending }}
        disabled={revealPhone.isPending}
        onPress={handlePhonePress}
        className='h-13 flex-1 items-center justify-center rounded-lg bg-primary px-8 active:opacity-90 disabled:opacity-50'
      >
        <Text className='text-sm font-medium text-white' numberOfLines={1}>
          {phoneTitle}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole='button'
        onPress={handleWritePress}
        className='h-13 items-center justify-center rounded-lg bg-secondary px-8 active:opacity-90'
      >
        <Text className='text-sm font-medium text-white'>Написать</Text>
      </Pressable>
    </View>
  )
}
