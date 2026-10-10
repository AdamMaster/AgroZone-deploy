import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { CallConfirmationStep } from '@/shared/components/call-confirmation-step'
import { FormError } from '@/shared/components/form-error'

import { authApi } from '../api/auth.api'
import { AuthDivider } from './auth-divider'
import { RegisterDetailsStep } from './register-details-step'
import { RegisterPhoneStep } from './register-phone-step'
import { YandexSignInButton } from './yandex-sign-in-button'

// Регистрация — те же три шага, что на сайте: номер → звонок на
// проверочный номер → имя и пароль. Сервер перепроверяет звонок и на
// последнем шаге, так что пропустить второй шаг нельзя.
type RegisterStep =
  | { name: 'phone' }
  | { name: 'call'; phone: string; callNumber: string }
  | { name: 'details'; phone: string; code: string }

export function RegisterFlow() {
  const [step, setStep] = useState<RegisterStep>({ name: 'phone' })
  const [yandexError, setYandexError] = useState<string | null>(null)

  const handleConfirmed = useCallback(
    (code: string) =>
      setStep(current => (current.name === 'call' ? { name: 'details', phone: current.phone, code } : current)),
    []
  )
  const restart = useCallback(() => setStep({ name: 'phone' }), [])

  if (step.name === 'call') {
    return (
      <CallConfirmationStep
        phone={step.phone}
        callNumber={step.callNumber}
        statusQueryKey={['auth', 'register-call-status', step.phone]}
        fetchStatus={signal => authApi.registerCallStatus(step.phone, signal)}
        onConfirmed={handleConfirmed}
        onChangePhone={restart}
      />
    )
  }

  if (step.name === 'details') {
    return <RegisterDetailsStep phone={step.phone} code={step.code} />
  }

  return (
    // Основной способ — регистрация по телефону, поэтому Яндекс под формой.
    <View className='gap-5'>
      <RegisterPhoneStep onCallRequested={params => setStep({ name: 'call', ...params })} />
      <AuthDivider />
      <FormError message={yandexError} />
      <YandexSignInButton onError={setYandexError} />
    </View>
  )
}
