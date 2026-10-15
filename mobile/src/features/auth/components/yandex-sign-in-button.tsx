import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { openSitePage } from '@/shared/utils/open-site-page'

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

// Кнопка Яндекса и под ней согласие на обработку персональных данных (152-ФЗ):
// у OAuth нет отдельного шага с чекбоксом, поэтому согласие даётся
// продолжением через Яндекс — тот же текст, что у AuthSocialsNotice сайта.
export function YandexSignInButton({ onError }: YandexSignInButtonProps) {
  const { mutate, isPending } = useYandexSignIn()

  return (
    <View className='gap-3'>
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
      <Text className='text-xs text-muted-foreground'>
        Продолжая через Яндекс, вы принимаете{' '}
        <Text className='text-primary underline' onPress={() => void openSitePage('/terms')}>
          Пользовательское соглашение
        </Text>{' '}
        и даёте согласие на обработку персональных данных согласно{' '}
        <Text className='text-primary underline' onPress={() => void openSitePage('/privacy')}>
          Политике конфиденциальности
        </Text>
        .
      </Text>
    </View>
  )
}
