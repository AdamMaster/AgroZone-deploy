import { z } from 'zod'

// Раньше здесь первая цифра номера оператора была жёстко ограничена [49] —
// то есть форма логина технически принимала только часть валидных
// российских номеров. Из-за этого можно было зарегистрироваться/добавить
// номер с любой первой цифрой (normalizePhone на бэкенде такого
// ограничения не делает), но потом не суметь ВОЙТИ под этим же номером —
// именно это и произошло при смене основного номера на аккаунте.
const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/

export const LoginSchema = z.object({
  login: z
    .string()
    .min(1, { message: 'Заполните поле' })
    .refine(value => z.string().email().safeParse(value).success || phoneRegex.test(value), {
      message: 'Некорректная почта или номер телефона'
    }),
  password: z.string().min(6, { message: 'Пароль минимум 6 символов' }),
  code: z.optional(z.string())
})

export type TypeLoginSchema = z.infer<typeof LoginSchema>
