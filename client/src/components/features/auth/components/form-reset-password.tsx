'use client'

import { useState } from 'react'

import { FormResetPasswordEmail } from './form-reset-password-email'
import { FormResetPasswordPhone } from './form-reset-password-phone'

// Сброс пароля. Основной способ — по звонку на номер, запасной — письмо со
// ссылкой для аккаунтов с привязанной почтой.
export const FormResetPassword = () => {
  const [isEmail, setIsEmail] = useState(false)

  return isEmail ? (
    <FormResetPasswordEmail onSwitchToPhone={() => setIsEmail(false)} />
  ) : (
    <FormResetPasswordPhone onSwitchToEmail={() => setIsEmail(true)} />
  )
}
