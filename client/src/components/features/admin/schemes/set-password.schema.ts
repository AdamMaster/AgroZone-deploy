import { z } from 'zod'

// Принудительная смена пароля из админки (/admin/users/:id, см.
// SetPasswordDialog) — та же минимальная длина, что и везде в проекте
// (AdminCreateUserSchema, PasswordChangeDto на сервере).
export const AdminSetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Минимум 6 символов')
})

export type TypeAdminSetPasswordSchema = z.infer<typeof AdminSetPasswordSchema>
