import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { z } from 'zod'

import { isValidPhone } from '@/shared/utils/phone'

// Правила и тексты ошибок — как у форм сайта (client/src/components/
// features/auth/schemes), чтобы пользователь видел одинаковые подсказки.

const RUSSIAN_PHONE_PATTERN = /^(\+7|7|8)?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/
const PHONE_CHARS = /^[\d\s()+-]+$/

const isInternationalPhone = (value: string) => {
  const trimmed = value.trim()

  if (!PHONE_CHARS.test(trimmed)) return false

  return Boolean(parsePhoneNumberFromString(trimmed.startsWith('+') ? trimmed : `+${trimmed}`)?.isValid())
}

export const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, 'Заполните поле')
    .refine(
      value => z.email().safeParse(value).success || RUSSIAN_PHONE_PATTERN.test(value) || isInternationalPhone(value),
      'Некорректная почта или номер телефона'
    ),
  password: z.string().min(6, 'Пароль минимум 6 символов'),
  code: z.string().trim().optional()
})

export type LoginValues = z.infer<typeof loginSchema>

export const registerPhoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Номер телефона указан не полностью')
    .max(24, 'Номер телефона слишком длинный')
    .refine(isValidPhone, 'Номер телефона указан не полностью')
})

export type RegisterPhoneValues = z.infer<typeof registerPhoneSchema>

export const registerFinalSchema = z
  .object({
    name: z.string().trim().min(2, 'Имя обязательно'),
    password: z.string().min(6, 'Минимум 6 символов'),
    passwordRepeat: z.string(),
    personalDataConsent: z.boolean().refine(value => value, 'Необходимо дать согласие на обработку персональных данных')
  })
  .refine(data => data.password === data.passwordRepeat, {
    message: 'Пароли не совпадают',
    path: ['passwordRepeat']
  })

export type RegisterFinalValues = z.infer<typeof registerFinalSchema>
