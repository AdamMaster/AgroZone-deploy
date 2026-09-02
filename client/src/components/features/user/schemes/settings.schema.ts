import { z } from 'zod'

import { UserType } from '@/components/features/auth/types'

export const SettingsSchema = z.object({
  name: z.string().min(2, { message: 'Имя должно быть не короче 2 символов' }),
  type: z.nativeEnum(UserType, { message: 'Выберите тип продавца' })
})

export type TypeSettingsSchema = z.infer<typeof SettingsSchema>
