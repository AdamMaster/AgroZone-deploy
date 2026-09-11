import { z } from 'zod'

export const AdminCreateUserSchema = z.object({
  phone: z
    .string()
    .min(10, 'Номер телефона указан не полностью')
    .max(18, 'Номер телефона слишком длинный')
    .regex(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, 'Некорректный формат телефона'),
  password: z.string().min(6, 'Минимум 6 символов'),
  displayName: z.string().optional()
})

export type TypeAdminCreateUserSchema = z.infer<typeof AdminCreateUserSchema>
