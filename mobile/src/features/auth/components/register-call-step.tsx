import { useQuery } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { formatPhoneForDisplay } from '@/shared/utils/phone'

import { authApi } from '../api/auth.api'

interface RegisterCallStepProps {
  phone: string
  callNumber: string
  onConfirmed: (code: string) => void
  onChangePhone: () => void
}

// Как часто спрашивать сервер «позвонили или нет» — как на сайте.
const CALL_STATUS_POLL_INTERVAL_MS = 4000

export function RegisterCallStep({ phone, callNumber, onConfirmed, onChangePhone }: RegisterCallStepProps) {
  // Опрос идёт, только пока приложение на экране: пока пользователь звонит,
  // приложение в фоне, а при возврате react-query сразу перепроверяет
  // статус (см. use-react-query-native-managers.ts). Ошибка (время ожидания
  // истекло) — конечное состояние, повторять опрос бессмысленно.
  const { data, error } = useQuery({
    queryKey: ['auth', 'register-call-status', phone],
    queryFn: ({ signal }) => authApi.registerCallStatus(phone, signal),
    refetchInterval: query => (query.state.data?.confirmed || query.state.error ? false : CALL_STATUS_POLL_INTERVAL_MS),
    retry: false,
    gcTime: 0
  })

  useEffect(() => {
    if (data?.confirmed && data.code) onConfirmed(data.code)
  }, [data, onConfirmed])

  const dialNumber = callNumber.replace(/[^\d+]/g, '')

  return (
    <View className='gap-5'>
      <Text className='text-sm text-muted-foreground'>
        Позвоните с номера {formatPhoneForDisplay(phone)} на номер ниже. Звонок бесплатный и сбросится сам —
        подтверждение придёт автоматически.
      </Text>

      <Text className='text-center text-3xl font-semibold text-foreground' selectable>
        {callNumber}
      </Text>

      {error ? (
        <View className='gap-4'>
          <FormError message={error.message} />
          <Button title='Запросить звонок заново' variant='outline' onPress={onChangePhone} />
        </View>
      ) : (
        <>
          <Button title='Позвонить' onPress={() => void Linking.openURL(`tel:${dialNumber}`)} />
          <Text className='text-center text-sm text-muted-foreground'>Ждём ваш звонок…</Text>
        </>
      )}

      <Pressable accessibilityRole='button' hitSlop={8} onPress={onChangePhone} className='self-center'>
        <Text className='text-sm font-semibold text-primary'>Изменить номер</Text>
      </Pressable>
    </View>
  )
}
