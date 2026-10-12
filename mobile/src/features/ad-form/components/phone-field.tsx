import { useState } from 'react'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { PhoneFlow, type PhoneFlowStep } from '@/features/profile/components/phone-flow'

import { Dialog } from '@/shared/components/dialog'
import { FormField } from '@/shared/components/form-field'
import { Input, InputAction } from '@/shared/components/input'
import { formatPhoneInput } from '@/shared/utils/phone'

interface PhoneFieldProps {
  value: string
  onChange: (phone: string) => void
  error?: string
}

// «Номер телефона» объявления — как на сайте: поле только для чтения, номер
// выбирается из привязанных к аккаунту или добавляется новый (с
// подтверждением звонком) в окне «Номер для связи».
export function PhoneField({ value, onChange, error }: PhoneFieldProps) {
  const { data: profile } = useProfile()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<PhoneFlowStep>('select')

  const open = () => {
    setStep(profile?.phones.length ? 'select' : 'phone')
    setIsOpen(true)
  }

  return (
    <FormField label='Номер телефона' error={error}>
      <Input
        value={value}
        editable={false}
        placeholder='+7 (999) 999-99-99'
        accessibilityLabel='Номер телефона'
        trailing={
          // «Использовать другой номер» сайта не помещается рядом с номером
          // на экране телефона.
          <InputAction title={profile?.primaryPhone ? 'Другой номер' : 'Добавить номер'} onPress={open} />
        }
      />

      <Dialog
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={step === 'select' ? 'Номер для связи' : 'Добавление номера'}
      >
        {isOpen && (
          <PhoneFlow
            mode='ad'
            onStepChange={setStep}
            onDone={phone => {
              onChange(formatPhoneInput(phone))
              setIsOpen(false)
            }}
          />
        )}
      </Dialog>
    </FormField>
  )
}
