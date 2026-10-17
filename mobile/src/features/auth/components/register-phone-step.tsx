import { useRouter } from 'expo-router'
import { Pressable, Text } from 'react-native'

import { ApiError } from '@/lib/api/api-error'

import { authApi } from '../api/auth.api'
import { PhoneRequestStep } from './phone-request-step'

interface RegisterPhoneStepProps {
  onCallRequested: (params: { phone: string; callNumber: string }) => void
}

export function RegisterPhoneStep({ onCallRequested }: RegisterPhoneStepProps) {
  const router = useRouter()

  return (
    <PhoneRequestStep
      description='Для подтверждения номера вы сделаете бесплатный звонок — код вводить не нужно.'
      requestCall={authApi.registerStart}
      onCallRequested={onCallRequested}
      // 409 — номер уже зарегистрирован: вместо тупика предлагаем войти.
      renderErrorAction={error =>
        error instanceof ApiError && error.statusCode === 409 ? (
          <Pressable accessibilityRole='link' hitSlop={8} onPress={() => router.replace('/login')}>
            <Text className='text-sm font-semibold text-primary'>Войти с этим номером</Text>
          </Pressable>
        ) : null
      }
    />
  )
}
