import { Linking, Pressable, Text, View } from 'react-native'

import { useRevealPhone } from '@/features/ads/hooks/use-ad-detail'
import { useIsSignedIn } from '@/features/auth/hooks/use-is-signed-in'
import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useChatNavigation } from '@/features/messages/hooks/use-chat-navigation'

import { formatPhoneInput } from '@/shared/utils/phone'

interface AdContactButtonsProps {
  adId: string
}

// «Показать телефон» и «Написать» — как у сайта. Номер выдаётся только
// вошедшим; показанный номер — ссылка «позвонить».
export function AdContactButtons({ adId }: AdContactButtonsProps) {
  const requestSignIn = useRequestSignIn()
  const isSignedIn = useIsSignedIn()
  const revealPhone = useRevealPhone()
  const { newConversationHref, openNewConversation } = useChatNavigation()
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

  // Переписка с продавцом открывается поверх объявления. Гостя сначала
  // просим войти — написать анонимно нельзя, как и на сайте; после входа
  // он попадает сразу в переписку (returnTo окна входа на сайте).
  const handleWritePress = () => {
    if (!isSignedIn) {
      requestSignIn(newConversationHref(adId))
      return
    }

    openNewConversation(adId)
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
