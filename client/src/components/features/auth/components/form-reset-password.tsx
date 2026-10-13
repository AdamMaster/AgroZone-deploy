'use client'

import { useState } from 'react'

import { parseLoginIdentifier } from '@/shared/utils'

import { FormResetPasswordEmail } from './form-reset-password-email'
import { FormResetPasswordPhone } from './form-reset-password-phone'

// Сброс пароля. Основной способ — по звонку на номер, запасной — письмо со
// ссылкой для аккаунтов с привязанной почтой.
//
// initialLogin — то, что пользователь уже набрал на форме входа: номер попадает
// в поле номера, почта — в форму сброса по почте (она и открывается).
interface FormResetPasswordProps {
  initialLogin?: string
}

export const FormResetPassword = ({ initialLogin }: FormResetPasswordProps) => {
  const { email, phone } = parseLoginIdentifier(initialLogin)
  const [isEmail, setIsEmail] = useState(!!email)

  return isEmail ? (
    <FormResetPasswordEmail initialEmail={email} onSwitchToPhone={() => setIsEmail(false)} />
  ) : (
    <FormResetPasswordPhone initialPhone={phone} onSwitchToEmail={() => setIsEmail(true)} />
  )
}
