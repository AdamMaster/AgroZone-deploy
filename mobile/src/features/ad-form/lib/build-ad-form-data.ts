import { type UploadFile, appendFile } from '@/lib/api/upload-file'

import type { AdFormValues } from '../schemas/ad-form.schema'
import type { AdFormPhoto } from '../types/ad-form.types'
import { type FeatureValues } from './feature-values'

// Имя поля для новых фото у разных ручек сервера: создание и черновик —
// 'files', изменение объявления (PATCH /ads/:id) — 'images'.
export type NewPhotosField = 'files' | 'images'

// Цена из поля ввода: «1 500,5» → «1500.5».
const normalizePrice = (price: string): string => price.replace(/\s/g, '').replace(',', '.')

// Тело запроса объявления — как buildAdFormData + appendImageFields сайта.
export function buildAdFormData(
  values: AdFormValues,
  features: FeatureValues,
  photosField: NewPhotosField,
  // Создание: старых фото нет, поле existingImages не нужно. Черновик и
  // изменение: отправляем явно, какие уже загруженные фото остаются
  // (пустая строка — «ни одного»): без поля сервер оставил бы прежние.
  withExistingImages: boolean
): FormData {
  const form = new FormData()
  const { location } = values

  form.append('title', values.title.trim())
  form.append('description', values.description.trim())

  const price = normalizePrice(values.price)
  if (price) form.append('price', price)

  form.append('unit', values.unit)
  form.append('categoryId', values.categoryId)
  form.append('address', values.address.trim())
  form.append('phone', values.phone)

  if (location) {
    form.append('lat', String(location.lat))
    form.append('lng', String(location.lng))
    if (location.region) form.append('region', location.region)
    if (location.regionIsoCode) form.append('regionIsoCode', location.regionIsoCode)
    if (location.locality) form.append('locality', location.locality)
    if (location.localityFiasId) form.append('localityFiasId', location.localityFiasId)
  }

  form.append('features', JSON.stringify(features))

  appendPhotos(form, values.photos, photosField, withExistingImages)

  return form
}

function appendPhotos(form: FormData, photos: readonly AdFormPhoto[], field: NewPhotosField, withExisting: boolean) {
  const existingUrls = photos.flatMap(photo => (photo.kind === 'remote' ? [photo.url] : []))
  const newFiles = photos.flatMap((photo): UploadFile[] => (photo.kind === 'local' ? [photo.file] : []))

  if (withExisting) {
    if (existingUrls.length === 0) {
      form.append('existingImages', '')
    } else {
      existingUrls.forEach(url => form.append('existingImages', url))
    }
  }

  newFiles.forEach(file => appendFile(form, field, file))
}
