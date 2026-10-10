import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { TextField } from '@/shared/components/text-field'

import { authApi, isTwoFactorRequired } from '../api/auth.api'
import { CaptchaCancelledError, useCaptcha } from '../hooks/use-captcha'
import { type LoginValues, loginSchema } from '../schemas/auth.schemas'
import { useAuthStore } from '../store/auth-store'
import { AuthDivider } from './auth-divider'
import { YandexSignInButton } from './yandex-sign-in-button'

// Вход по телефону (или почте) и паролю — как на сайте. Каждая попытка
// проходит Яндекс-капчу: сервер проверяет её на ручке входа для всех
// клиентов, иначе её можно было бы обойти, представившись приложением.
export function LoginForm() {
  const router = useRouter()
  const signIn = useAuthStore(state => state.signIn)
  const { requestCaptcha, captchaModal } = useCaptcha()
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '', code: '' }
  })

  const { mutate: login, isPending } = useMutation({
    mutationFn: async (values: LoginValues) => {
      const captchaToken = await requestCaptcha()

      return authApi.login({
        login: values.login,
        password: values.password,
        code: isTwoFactorStep ? values.code : undefined,
        captchaToken
      })
    },
    onSuccess: async response => {
      // Аккаунт с двухфакторной защитой: код отправлен на почту.
      if (isTwoFactorRequired(response)) {
        setIsTwoFactorStep(true)
        return
      }

      await signIn(response)
    },
    onError: error => {
      if (error instanceof CaptchaCancelledError) return
      setFormError(error.message)
    }
  })

  const onSubmit = form.handleSubmit(values => {
    if (isTwoFactorStep && !values.code) {
      form.setError('code', { message: 'Введите код подтверждения' })
      return
    }

    setFormError(null)
    login(values)
  })

  return (
    <View className='gap-5'>
      {captchaModal}

      <FormError message={formError} />

      {isTwoFactorStep ? (
        <View className='gap-3'>
          <Text className='text-sm text-muted-foreground'>
            Мы отправили одноразовый код подтверждения на вашу почту. Введите его ниже.
          </Text>
          <Controller
            control={form.control}
            name='code'
            render={({ field, fieldState }) => (
              <TextField
                label='Код из письма'
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType='number-pad'
                autoComplete='one-time-code'
                textContentType='oneTimeCode'
                returnKeyType='done'
                onSubmitEditing={onSubmit}
              />
            )}
          />
        </View>
      ) : (
        <>
          <Controller
            control={form.control}
            name='login'
            render={({ field, fieldState }) => (
              <TextField
                label='Телефон или почта'
                placeholder='+7 (999) 123-45-67'
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize='none'
                autoCorrect={false}
                autoComplete='username'
                textContentType='username'
                keyboardType='email-address'
                returnKeyType='next'
                onSubmitEditing={() => form.setFocus('password')}
              />
            )}
          />
          <Controller
            control={form.control}
            name='password'
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label='Пароль'
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                isPassword
                autoCapitalize='none'
                autoComplete='current-password'
                textContentType='password'
                returnKeyType='done'
                onSubmitEditing={onSubmit}
              />
            )}
          />
        </>
      )}

      <Button title={isTwoFactorStep ? 'Подтвердить' : 'Войти'} isLoading={isPending} onPress={onSubmit} />

      {/* Основной способ — телефон и пароль, поэтому Яндекс под формой, а не над ней. */}
      {!isTwoFactorStep && (
        <>
          <AuthDivider />
          <YandexSignInButton onError={setFormError} />
        </>
      )}

      {!isTwoFactorStep && (
        <View className='flex-row justify-center gap-1'>
          <Text className='text-sm text-muted-foreground'>Нет аккаунта?</Text>
          <Pressable accessibilityRole='link' hitSlop={8} onPress={() => router.replace('/register')}>
            <Text className='text-sm font-semibold text-primary'>Зарегистрироваться</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
