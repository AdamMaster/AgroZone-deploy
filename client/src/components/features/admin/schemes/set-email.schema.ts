import { z } from 'zod'

// Задать/сменить email из админки (/admin/users/:id, см. SetEmailDialog).
export const AdminSetEmailSchema = z.object({
  newEmail: z.string().email('Введите корректный email')
})

export type TypeAdminSetEmailSchema = z.infer<typeof AdminSetEmailSchema>
