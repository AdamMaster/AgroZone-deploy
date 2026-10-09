import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'

import { useYandexSignIn } from '../hooks/use-yandex-sign-in'

interface YandexSignInButtonProps {
  onError: (message: string) => void
}

function YandexLogo() {
  return (
    <View className='size-6 items-center justify-center rounded-full bg-[#fc3f1d]'>
      <Text className='text-sm font-bold text-white'>Я</Text>
    </View>
  )
}

export function YandexSignInButton({ onError }: YandexSignInButtonProps) {
  const { mutate, isPending } = useYandexSignIn()

  return (
    <Button
      title='Войти с Яндекс ID'
      variant='outline'
      icon={<YandexLogo />}
      isLoading={isPending}
      onPress={() =>
        mutate(undefined, {
          onError: error => onError(error.message)
        })
      }
    />
  )
}
