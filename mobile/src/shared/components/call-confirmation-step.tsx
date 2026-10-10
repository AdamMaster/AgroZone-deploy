import { type QueryKey, useQuery } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'

import { formatPhoneForDisplay } from '@/shared/utils/phone'

import { Button } from './button'
import { FormError } from './form-error'

export interface CallConfirmationStatus {
  confirmed: boolean
  // Когда звонок подтверждён — код, который нужно передать серверу
  // следующим шагом (id проверки у провайдера звонков).
  code?: string
}

interface CallConfirmationStepProps {
  phone: string
  callNumber: string
  // Ключ опроса — у регистрации и у смены номера свои ручки статуса.
  statusQueryKey: QueryKey
  fetchStatus: (signal: AbortSignal) => Promise<CallConfirmationStatus>
  onConfirmed: (code: string) => void
  onChangePhone: () => void
}

// Как часто спрашивать сервер «позвонили или нет» — как на сайте.
const CALL_STATUS_POLL_INTERVAL_MS = 4000

// Подтверждение номера звонком — общий шаг регистрации и смены телефона,
// как на сайте: пользователь звонит на показанный номер, звонок
// сбрасывается сам, приложение узнаёт о нём опросом сервера.
export function CallConfirmationStep({
  phone,
  callNumber,
  statusQueryKey,
  fetchStatus,
  onConfirmed,
  onChangePhone
}: CallConfirmationStepProps) {
  // Опрос идёт, только пока приложение на экране: пока пользователь звонит,
  // приложение в фоне, а при возврате react-query сразу перепроверяет
  // статус (см. use-react-query-native-managers.ts). Ошибка (время ожидания
  // истекло) — конечное состояние, повторять опрос бессмысленно.
  const { data, error } = useQuery({
    queryKey: statusQueryKey,
    queryFn: ({ signal }) => fetchStatus(signal),
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
