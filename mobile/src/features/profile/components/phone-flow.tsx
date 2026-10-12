import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { type PhoneValues, phoneSchema } from '@/features/auth/schemas/auth.schemas'

import { Button } from '@/shared/components/button'
import { CallConfirmationStep } from '@/shared/components/call-confirmation-step'
import { FormField } from '@/shared/components/form-field'
import { Input } from '@/shared/components/input'
import { SelectField } from '@/shared/components/select-field'
import { formatPhoneInput, phoneToApi } from '@/shared/utils/phone'

import { profileApi } from '../api/profile.api'
import { useConfirmPhone, useRequestPhone, useSetPrimaryPhone } from '../hooks/use-profile-mutations'
import { FormIntro } from './form-intro'

// select — выбрать один из уже подтверждённых номеров; phone — ввести
// новый; call — подтвердить новый звонком. Как FormAddPhone сайта.
type Step = { name: 'select' } | { name: 'phone' } | { name: 'call'; phone: string; callNumber: string }
export type PhoneFlowStep = Step['name']

// profile — номер для входа и связи в профиле: выбранный или добавленный
// становится основным. ad — номер для конкретного объявления: основной не
// меняется, номер просто подставляется в форму.
export type PhoneFlowMode = 'profile' | 'ad'

const STEP_DESCRIPTIONS: Record<Step['name'], string> = {
  select: 'Выберите один из привязанных номеров или укажите новый',
  phone: 'Укажите номер телефона для связи',
  call: 'Позвоните для подтверждения'
}

interface PhoneFlowProps {
  mode: PhoneFlowMode
  // Номер выбран или добавлен (в формате сервера, «+79991234567»).
  onDone: (phone: string) => void
  // Шаг сменился — у окна объявления от шага зависит заголовок.
  onStepChange?: (step: PhoneFlowStep) => void
}

export function PhoneFlow({ mode, onDone, onStepChange }: PhoneFlowProps) {
  const isProfileMode = mode === 'profile'
  const { data: profile } = useProfile()
  const phones = profile?.phones ?? []
  const hasPhones = phones.length > 0
  const [step, setStepState] = useState<Step>(() => ({ name: hasPhones ? 'select' : 'phone' }))
  const [selectedPhone, setSelectedPhone] = useState<string | undefined>(
    () => phones.find(phone => phone.isPrimary)?.phone ?? phones[0]?.phone
  )

  const { mutate: requestPhone, isPending: isRequesting } = useRequestPhone()
  const { mutate: confirmPhone, isPending: isConfirming } = useConfirmPhone(isProfileMode)
  const { mutate: setPrimaryPhone, isPending: isSettingPrimary } = useSetPrimaryPhone()

  const form = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' }
  })

  const setStep = useCallback(
    (next: Step) => {
      setStepState(next)
      onStepChange?.(next.name)
    },
    [onStepChange]
  )

  const applySelectedPhone = () => {
    if (!selectedPhone) return

    if (isProfileMode) {
      setPrimaryPhone(selectedPhone, { onSuccess: () => onDone(selectedPhone) })
    } else {
      onDone(selectedPhone)
    }
  }

  const submitPhone = form.handleSubmit(values => {
    const phone = phoneToApi(values.phone)

    requestPhone(phone, { onSuccess: ({ callNumber }) => setStep({ name: 'call', phone, callNumber }) })
  })

  const backToPhone = useCallback(() => setStep({ name: 'phone' }), [setStep])

  // Звонок подтверждён — номер добавляется (в профиле — сразу основным).
  // Если сервер не принял подтверждение, звонок нужно запросить заново:
  // опрос того же звонка снова вернул бы уже отклонённый код.
  const handleConfirmed = useCallback(
    (code: string) => {
      if (step.name !== 'call') return
      const { phone } = step
      confirmPhone(code, { onSuccess: () => onDone(phone), onError: backToPhone })
    },
    [step, confirmPhone, onDone, backToPhone]
  )

  return (
    <View>
      <FormIntro>{STEP_DESCRIPTIONS[step.name]}</FormIntro>

      {step.name === 'select' && (
        <View className='gap-4'>
          <SelectField
            value={selectedPhone}
            options={phones.map(phone => ({
              value: phone.phone,
              label: `${formatPhoneInput(phone.phone)}${phone.isPrimary ? ' (основной)' : ''}`
            }))}
            onChange={setSelectedPhone}
            accessibilityLabel='Номер телефона'
            placeholder='Выберите номер'
            width='full'
          />
          <Button
            title={isProfileMode ? 'Сделать основным' : 'Использовать этот номер'}
            variant='secondary'
            isLoading={isSettingPrimary}
            disabled={!selectedPhone}
            onPress={applySelectedPhone}
          />
          <Pressable
            accessibilityRole='button'
            hitSlop={8}
            onPress={() => setStep({ name: 'phone' })}
            className='self-center'
          >
            <Text className='text-sm text-muted-foreground underline'>Указать другой номер</Text>
          </Pressable>
        </View>
      )}

      {step.name === 'phone' && (
        <View>
          <Controller
            control={form.control}
            name='phone'
            render={({ field, fieldState }) => (
              <FormField error={fieldState.error?.message}>
                <Input
                  value={field.value}
                  onChangeText={text => field.onChange(formatPhoneInput(text, field.value))}
                  onBlur={field.onBlur}
                  placeholder='+7 (999) 999-99-99'
                  accessibilityLabel='Номер телефона'
                  keyboardType='phone-pad'
                  autoComplete='tel'
                  textContentType='telephoneNumber'
                  maxLength={24}
                  returnKeyType='done'
                  onSubmitEditing={submitPhone}
                />
              </FormField>
            )}
          />
          <View className='mt-6 flex-row gap-3'>
            {hasPhones && (
              <Button
                title='Назад'
                variant='outline'
                disabled={isRequesting}
                onPress={() => setStep({ name: 'select' })}
              />
            )}
            <View className='flex-1'>
              <Button title='Продолжить' variant='secondary' isLoading={isRequesting} onPress={submitPhone} />
            </View>
          </View>
        </View>
      )}

      {step.name === 'call' &&
        (isConfirming ? (
          <View className='items-center py-16'>
            <ActivityIndicator colorClassName='accent-primary' />
          </View>
        ) : (
          <CallConfirmationStep
            phone={step.phone}
            callNumber={step.callNumber}
            statusQueryKey={['profile-phone-call-status', step.phone]}
            fetchStatus={profileApi.phoneCallStatus}
            onConfirmed={handleConfirmed}
            onChangePhone={backToPhone}
          />
        ))}
    </View>
  )
}
