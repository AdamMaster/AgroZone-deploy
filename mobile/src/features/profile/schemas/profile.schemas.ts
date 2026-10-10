import { z } from 'zod'

import { SELLER_TYPE_LABELS, type SellerType } from '@/shared/constants/seller-types'

// Правила и тексты ошибок — как у форм настроек сайта
// (client/src/components/features/user/schemes).

const sellerTypes = Object.keys(SELLER_TYPE_LABELS) as [SellerType, ...SellerType[]]

export const profileDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Имя должно быть не короче 2 символов'),
  type: z.enum(sellerTypes, 'Выберите тип продавца')
})

export type ProfileDetailsValues = z.infer<typeof profileDetailsSchema>

// Текущий пароль обязателен только у аккаунта, где пароль уже есть, — это
// проверяет сервер («Необходимо указать текущий пароль»).
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string().min(6, 'Минимум 6 символов')
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword']
  })

export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>

export const emailChangeSchema = z.object({
  newEmail: z.string().trim().min(1, 'Заполните новую почту').pipe(z.email('Некорректная почта')),
  password: z.string().min(6, 'Пароль минимум 6 символов')
})

export type EmailChangeValues = z.infer<typeof emailChangeSchema>
