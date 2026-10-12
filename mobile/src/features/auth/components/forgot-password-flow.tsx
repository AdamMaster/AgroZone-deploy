import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { CallConfirmationStep } from '@/shared/components/call-confirmation-step'
import { ScreenMessage } from '@/shared/components/screen-message'

import { authApi } from '../api/auth.api'
import { useFinishPasswordReset } from '../hooks/use-finish-password-reset'
import { ForgotPasswordForm } from './forgot-password-form'
import { ForgotPasswordPhoneStep } from './forgot-password-phone-step'
import { NewPasswordFields } from './new-password-fields'

// Сброс пароля. Основной способ — звонок на номер: номер → звонок на
// проверочный номер → новый пароль (как регистрация; сервер перепроверяет
// звонок и на последнем шаге, так что пропустить второй шаг нельзя). Для
// аккаунтов с почтой есть запасной — письмо со ссылкой на новый пароль, как
// на сайте.
type ForgotPasswordStep =
  | { name: 'phone' }
  | { name: 'email' }
  | { name: 'email-sent' }
  | { name: 'call'; phone: string; callNumber: string }
  | { name: 'password'; phone: string; code: string }

export function ForgotPasswordFlow() {
  const router = useRouter()
  const [step, setStep] = useState<ForgotPasswordStep>({ name: 'phone' })

  const restart = useCallback(() => setStep({ name: 'phone' }), [])
  const handleConfirmed = useCallback(
    (code: string) =>
      setStep(current => (current.name === 'call' ? { name: 'password', phone: current.phone, code } : current)),
    []
  )

  if (step.name === 'call') {
    return (
      <CallConfirmationStep
        phone={step.phone}
        callNumber={step.callNumber}
        statusQueryKey={['auth', 'reset-call-status', step.phone]}
        fetchStatus={signal => authApi.passwordResetCallStatus(step.phone, signal)}
        onConfirmed={handleConfirmed}
        onChangePhone={restart}
      />
    )
  }

  if (step.name === 'password') {
    return <ForgotPasswordNewPassword phone={step.phone} code={step.code} />
  }

  if (step.name === 'email-sent') {
    return (
      <ScreenMessage
        title='Проверьте почту'
        description='Если аккаунт с таким адресом существует, мы отправили на него ссылку для сброса пароля.'
        action={{ title: 'Войти в аккаунт', onPress: () => router.replace('/login') }}
      />
    )
  }

  const isEmail = step.name === 'email'
  const alternative: ForgotPasswordStep = isEmail ? { name: 'phone' } : { name: 'email' }

  return (
    <View className='gap-6'>
      {isEmail ? (
        <ForgotPasswordForm onSent={() => setStep({ name: 'email-sent' })} />
      ) : (
        <ForgotPasswordPhoneStep onCallRequested={params => setStep({ name: 'call', ...params })} />
      )}

      <View className='items-center gap-4'>
        <Pressable accessibilityRole='button' hitSlop={8} onPress={() => setStep(alternative)}>
          <Text className='text-sm font-semibold text-primary'>
            {isEmail ? 'Сбросить по номеру телефона' : 'Сбросить по почте'}
          </Text>
        </Pressable>

        <Pressable accessibilityRole='link' hitSlop={8} onPress={() => router.replace('/login')}>
          <Text className='text-base text-foreground'>Войти в аккаунт</Text>
        </Pressable>
      </View>
    </View>
  )
}

function ForgotPasswordNewPassword({ phone, code }: { phone: string; code: string }) {
  const finish = useFinishPasswordReset()
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate: setNewPassword, isPending } = useMutation({
    mutationFn: (password: string) => authApi.setNewPasswordByPhone({ phone, code, password }),
    onSuccess: finish,
    onError: error => setFormError(error.message)
  })

  return (
    <NewPasswordFields
      isPending={isPending}
      error={formError}
      onSubmit={values => {
        setFormError(null)
        setNewPassword(values.password)
      }}
    />
  )
}
