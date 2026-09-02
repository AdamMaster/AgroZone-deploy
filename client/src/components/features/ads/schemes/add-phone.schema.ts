import { z } from 'zod'

export const AddPhoneSchema = z.object({
  phone: z.string().min(18, 'Введите номер телефона')
})

export type TypeAddPhoneSchema = z.infer<typeof AddPhoneSchema>

export const PhoneCodeSchema = z.object({
  code: z.string().length(4, { message: 'Код должен состоять из 4 цифр' })
})
export type TypePhoneCodeSchema = z.infer<typeof PhoneCodeSchema>
