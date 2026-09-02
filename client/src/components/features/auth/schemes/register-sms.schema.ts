import { z } from 'zod'

export const RegisterSmsPhoneSchema = z.object({
  phone: z
    .string()
    .min(10, 'Номер телефона указан не полностью')
    .max(18, 'Номер телефона слишком длинный')
    .regex(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, 'Некорректный формат телефона')
})
export const RegisterSmsCodeSchema = z.object({
  code: z.string().length(4, 'Код должен быть из 4 цифр')
})

export const RegisterSmsFinalSchema = z
  .object({
    name: z.string().min(2, 'Имя обязательно'),
    password: z.string().min(6, 'Минимум 6 символов'),
    passwordRepeat: z.string(),
    // 152-ФЗ: без согласия на обработку персональных данных регистрация
    // невозможна — см. чекбокс в FormRegisterSms (шаг 3).
    personalDataConsent: z
      .boolean()
      .refine(value => value === true, { message: 'Необходимо дать согласие на обработку персональных данных' })
  })
  .refine(data => data.password === data.passwordRepeat, {
    message: 'Пароли не совпадают',
    path: ['passwordRepeat']
  })

export type TypeRegisterSmsPhoneSchema = z.infer<typeof RegisterSmsPhoneSchema>
export type TypeRegisterSmsCodeSchema = z.infer<typeof RegisterSmsCodeSchema>
export type TypeRegisterSmsFinalSchema = z.infer<typeof RegisterSmsFinalSchema>
