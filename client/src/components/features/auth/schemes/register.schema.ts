import { z } from 'zod'

export const RegisterSchema = z
  .object({
    name: z.string().min(2, { message: 'Имя должно быть не короче 2 символов' }),
    email: z.string().min(1, { message: 'Заполните почту' }).email({ message: 'Некорректная почта' }),
    password: z.string().min(6, { message: 'Пароль минимум 6 символов' }),
    passwordRepeat: z.string().min(6, { message: 'Повторите пароль' }),
    // 152-ФЗ: без согласия на обработку персональных данных регистрация
    // невозможна — см. чекбокс в FormRegister.
    personalDataConsent: z
      .boolean()
      .refine(value => value === true, { message: 'Необходимо дать согласие на обработку персональных данных' })
  })
  .refine(data => data.password === data.passwordRepeat, {
    message: 'Пароли не совпадают',
    path: ['passwordRepeat']
  })

export type TypeRegisterSchema = z.infer<typeof RegisterSchema>
