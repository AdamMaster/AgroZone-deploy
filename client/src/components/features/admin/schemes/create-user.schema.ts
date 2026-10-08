import { z } from 'zod'

import { isValidPhone } from '@/shared/utils/format-phone-numbers'

export const AdminCreateUserSchema = z.object({
  phone: z
    .string()
    .min(10, 'Номер телефона указан не полностью')
    .max(24, 'Номер телефона слишком длинный')
    .refine(isValidPhone, 'Некорректный формат телефона'),
  password: z.string().min(6, 'Минимум 6 символов'),
  displayName: z.string().optional(),
  // Необязательно: не у всех продавцов, заведённых вручную, есть email —
  // пустая строка допустима (поле просто не уйдёт в payload), иначе
  // значение должно быть корректным email.
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Введите корректный email')]).optional()
})

export type TypeAdminCreateUserSchema = z.infer<typeof AdminCreateUserSchema>
