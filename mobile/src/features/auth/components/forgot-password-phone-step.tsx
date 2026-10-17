import { authApi } from '../api/auth.api'
import { PhoneRequestStep } from './phone-request-step'

interface ForgotPasswordPhoneStepProps {
  // Номер, уже набранный на форме входа.
  initialPhone?: string
  // Введённое значение — для переноса обратно на форму входа.
  onValueChange: (value: string) => void
  onCallRequested: (params: { phone: string; callNumber: string }) => void
}

// Первый шаг сброса по звонку: номер аккаунта. Дальше — звонок на
// проверочный номер, как при регистрации.
export function ForgotPasswordPhoneStep({
  initialPhone,
  onValueChange,
  onCallRequested
}: ForgotPasswordPhoneStepProps) {
  return (
    <PhoneRequestStep
      description='Введите номер телефона вашего аккаунта. Для подтверждения вы сделаете бесплатный звонок — код вводить не нужно.'
      requestCall={authApi.requestPasswordResetCall}
      onCallRequested={onCallRequested}
      initialPhone={initialPhone}
      onValueChange={onValueChange}
    />
  )
}
