import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Text, View } from 'react-native'

import type { UserProfile } from '@/features/auth/types/auth.types'

import { Button } from '@/shared/components/button'
import { FormField } from '@/shared/components/form-field'
import { Input, InputAction } from '@/shared/components/input'
import { SelectField } from '@/shared/components/select-field'
import { SELLER_TYPE_OPTIONS } from '@/shared/constants/seller-types'

import { useUpdateProfile, useVerifyBusiness } from '../hooks/use-profile-mutations'
import { type ProfileDetailsValues, profileDetailsSchema } from '../schemas/profile.schemas'

const INN_MAX_LENGTH = 12

// Имя, тип продавца и подтверждение ИП/компании по ИНН — верхняя форма
// «Личных данных» сайта.
export function ProfileDetailsForm({ profile }: { profile: UserProfile }) {
  const form = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    // values, а не defaultValues: после сохранения (или подтверждения ИНН,
    // которое может сменить тип) форма показывает то, что сохранено. Поля,
    // которые пользователь уже начал менять, при этом не сбрасываются.
    values: { name: profile.displayName ?? '', type: profile.type },
    resetOptions: { keepDirtyValues: true }
  })
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile()
  const { mutate: verifyBusiness, isPending: isVerifying } = useVerifyBusiness()

  // Поле ИНН появляется сразу при выборе «ИП» или «Компания», ещё до
  // сохранения, — как на сайте.
  const selectedType = useWatch({ control: form.control, name: 'type' })
  const [inn, setInn] = useState(profile.businessInn ?? '')
  const [syncedInn, setSyncedInn] = useState(profile.businessInn)

  // Подставляем подтверждённый ИНН, когда он появился или сменился в профиле
  // (например, сразу после подтверждения) — во время отрисовки, без лишнего
  // прохода через эффект.
  if (profile.businessInn !== syncedInn) {
    setSyncedInn(profile.businessInn)
    if (profile.businessInn) setInn(profile.businessInn)
  }

  const submit = form.handleSubmit(values => updateProfile({ name: values.name, type: values.type }))

  const confirmInn = () => {
    const value = inn.trim()
    if (!value) return

    // Тип продавца сервер ставит по найденной организации — форма его
    // показывает, даже если пользователь выбрал другой и не сохранил.
    verifyBusiness(
      { inn: value, expectedType: selectedType },
      { onSuccess: updated => form.resetField('type', { defaultValue: updated.type }) }
    )
  }

  return (
    <View className='gap-6'>
      <Controller
        control={form.control}
        name='name'
        render={({ field, fieldState }) => (
          <FormField label='Имя' error={fieldState.error?.message}>
            <Input
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder='Имя'
              autoComplete='name'
              textContentType='name'
              accessibilityLabel='Имя'
            />
          </FormField>
        )}
      />

      <Controller
        control={form.control}
        name='type'
        render={({ field, fieldState }) => (
          <FormField label='Тип продавца' error={fieldState.error?.message}>
            <SelectField
              value={field.value}
              options={SELLER_TYPE_OPTIONS}
              onChange={field.onChange}
              accessibilityLabel='Тип продавца'
              width='full'
            />
          </FormField>
        )}
      />

      {selectedType !== 'INDIVIDUAL' && (
        <FormField
          label='ИНН'
          description={`Подтвердите ${selectedType === 'BUSINESS' ? 'компанию' : 'ИП'} по ИНН — данные проверяются через сервис DaData. Подтверждённое название будет показано на ваших объявлениях.`}
        >
          <Input
            value={inn}
            onChangeText={text => setInn(text.replace(/\D/g, '').slice(0, INN_MAX_LENGTH))}
            placeholder='ИНН'
            keyboardType='number-pad'
            editable={!isVerifying}
            accessibilityLabel='ИНН'
            trailing={<InputAction title='Подтвердить' onPress={confirmInn} disabled={isVerifying || !inn.trim()} />}
          />
          {profile.businessVerifiedAt && (
            <Text className='text-xs text-primary'>Подтверждено: {profile.businessName}</Text>
          )}
        </FormField>
      )}

      <View className='self-start'>
        <Button title='Сохранить' variant='secondary' isLoading={isUpdating} onPress={submit} />
      </View>
    </View>
  )
}
