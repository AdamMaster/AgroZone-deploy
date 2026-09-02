import { z } from 'zod'

export const ResetPasswordSchema = z.object({
  email: z.string().min(1, { message: 'Заполните почту' }).email({ message: 'Некорректная почта' })
})

export type TypeResetPasswordSchema = z.infer<typeof ResetPasswordSchema>
