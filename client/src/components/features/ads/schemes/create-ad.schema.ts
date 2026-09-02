import { z } from 'zod'

export const CreateAdSchema = z.object({
  title: z.string().min(3, 'Название должно быть не менее 3 символов'),
  description: z.string().min(10, 'Описание должно быть не менее 10 символов'),
  price: z.string().optional(),
  // Значение — enum Prisma PriceUnit ('ITEM', 'TON', 'KG', ...), см.
  // server/prisma/schema.prisma. 'ITEM' — универсальный запасной вариант,
  // подходит для любой категории.
  unit: z.string().default('ITEM'),
  images: z.array(z.any()).default([]),
  address: z.string().min(5, 'Укажите адрес'),
  lat: z.number().min(-90, 'Выберите местоположение'),
  lng: z.number().min(-180, 'Выберите местоположение'),
  // Заполняются автоматически из AddressInput (тот же DaData-ответ, что и
  // адрес/координаты) — не отдельное поле формы, пользователь их не вводит.
  region: z.string().optional(),
  regionIsoCode: z.string().optional(),
  locality: z.string().optional(),
  localityFiasId: z.string().optional(),
  phone: z
    .string()
    .min(10, 'Номер телефона указан не полностью')
    .max(18, 'Номер телефона слишком длинный')
    .regex(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, 'Некорректный формат телефона'),

  categoryId: z.string().min(1, 'Выберите категорию'),
  categoryFeatures: z.record(z.string(), z.any()).optional().default({})
})

export type TypeCreateAdSchema = z.input<typeof CreateAdSchema>
