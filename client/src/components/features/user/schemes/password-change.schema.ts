import { z } from 'zod'

export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string().min(6, 'Минимум 6 символов')
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword']
  })

export type TypePasswordChangeSchema = z.infer<typeof PasswordChangeSchema>
