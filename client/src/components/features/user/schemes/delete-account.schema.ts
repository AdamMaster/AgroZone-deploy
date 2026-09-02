import { z } from 'zod'

// Пароль опционален на уровне схемы — для чисто OAuth-аккаунтов (без
// пароля) поле в форме вообще не показывается (см. FormDeleteAccount),
// а обязательность для остальных проверяется на сервере (см.
// UserService.deleteAccount).
export const DeleteAccountSchema = z.object({
  password: z.string().optional()
})

export type TypeDeleteAccountSchema = z.infer<typeof DeleteAccountSchema>
