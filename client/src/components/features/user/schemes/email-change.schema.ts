import { z } from 'zod'

export const EmailChangeShema = z.object({
  newEmail: z.string().min(1, { message: 'Заполните новую почту' }).email({ message: 'Некорректная почта' }),
  password: z.string().min(6, { message: 'Пароль минимум 6 символов' })
})

export type TypeEmailChangeShema = z.infer<typeof EmailChangeShema>
