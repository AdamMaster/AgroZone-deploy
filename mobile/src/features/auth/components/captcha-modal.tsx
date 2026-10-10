import { useState } from 'react'
import { Modal, Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { StyledSafeAreaView } from '@/shared/components/styled'

import { CaptchaWebView } from './captcha-webview'

interface CaptchaModalProps {
  visible: boolean
  onToken: (token: string) => void
  onCancel: () => void
}

export function CaptchaModal({ visible, onToken, onCancel }: CaptchaModalProps) {
  const [hasError, setHasError] = useState(false)
  // Новый ключ — новая страница капчи: «Повторить» после ошибки и каждое
  // открытие начинаются с чистого виджета.
  const [attempt, setAttempt] = useState(0)

  const retry = () => {
    setHasError(false)
    setAttempt(value => value + 1)
  }

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onCancel}
      onShow={retry}
    >
      <StyledSafeAreaView className='flex-1 bg-background' edges={['top', 'bottom']}>
        <View className='gap-1 px-5 pt-4 pb-2'>
          <Text className='text-lg font-semibold text-foreground'>Проверка безопасности</Text>
          <Text className='text-sm text-muted-foreground'>Подтвердите, что вы не робот</Text>
        </View>

        <View className='flex-1'>
          {hasError ? (
            <View className='flex-1 items-center justify-center gap-4 px-8'>
              <Text className='text-center text-sm text-muted-foreground'>
                Не удалось загрузить проверку. Проверьте интернет и попробуйте ещё раз.
              </Text>
              <Button title='Повторить' variant='outline' onPress={retry} />
            </View>
          ) : (
            <CaptchaWebView key={attempt} onToken={onToken} onError={() => setHasError(true)} />
          )}
        </View>

        <View className='px-5 pb-4'>
          <Button title='Отмена' variant='outline' onPress={onCancel} />
        </View>
      </StyledSafeAreaView>
    </Modal>
  )
}
