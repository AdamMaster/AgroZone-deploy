import { z } from 'zod'

import { isValidPhone } from '@/shared/utils/phone'

import { isValidPrice } from '../lib/price'
import type { AdFormPhoto } from '../types/ad-form.types'

// Правила и тексты ошибок — как CreateAdSchema сайта.
export const adFormSchema = z.object({
  title: z.string().trim().min(3, 'Название должно быть не менее 3 символов'),
  description: z.string().trim().min(10, 'Описание должно быть не менее 10 символов'),
  // Строкой, как в поле ввода; пусто — «цена не указана».
  price: z.string().refine(isValidPrice, 'Введите корректную цену'),
  unit: z.string(),
  photos: z.array(z.custom<AdFormPhoto>()),
  address: z.string().trim().min(5, 'Укажите адрес'),
  // Точку даёт только выбранная подсказка адреса: набранный вручную текст
  // без неё — не место на карте (на сайте такой адрес уходил с точкой 0,0).
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      region: z.string().optional(),
      regionIsoCode: z.string().optional(),
      locality: z.string().optional(),
      localityFiasId: z.string().optional()
    })
    .nullable()
    .refine(value => value !== null, 'Выберите адрес из подсказок'),
  phone: z
    .string()
    .min(10, 'Номер телефона указан не полностью')
    .max(24, 'Номер телефона слишком длинный')
    .refine(isValidPhone, 'Некорректный формат телефона'),
  categoryId: z.string().min(1, 'Выберите категорию'),
  categoryFeatures: z.record(z.string(), z.unknown())
})

// Поля формы (точки может ещё не быть) и проверенные значения для отправки
// (точка уже есть).
export type AdFormFields = z.input<typeof adFormSchema>
export type AdFormValues = z.output<typeof adFormSchema>
