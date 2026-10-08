import { z } from 'zod'

import { isValidPhone } from '@/shared/utils/format-phone-numbers'

export const AddPhoneSchema = z.object({
  phone: z.string().min(1, 'Введите номер телефона').refine(isValidPhone, 'Номер телефона указан не полностью')
})

export type TypeAddPhoneSchema = z.infer<typeof AddPhoneSchema>

export const PhoneCodeSchema = z.object({
  code: z.string().length(4, { message: 'Код должен состоять из 4 цифр' })
})
export type TypePhoneCodeSchema = z.infer<typeof PhoneCodeSchema>
