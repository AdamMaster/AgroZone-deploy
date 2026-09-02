import { TypeCreateAdSchema } from '../schemes'

export const buildAdFormData = (values: Partial<TypeCreateAdSchema>) => {
  const formData = new FormData()

  if (values.title) formData.append('title', values.title)
  if (values.description) formData.append('description', values.description)

  if (values.price !== undefined && values.price !== null && String(values.price).trim() !== '') {
    formData.append('price', String(values.price))
  }

  if (values.unit) formData.append('unit', values.unit)

  if (values.categoryId) formData.append('categoryId', values.categoryId)
  if (values.address) formData.append('address', values.address)

  // Раньше номер телефона тут вообще не отправлялся — форма показывала
  // введённый номер визуально (form.setValue отрабатывал), но на сервер он
  // не долетал. Для пользователей с уже привязанным основным номером это
  // маскировалось запасным вариантом в AdsService.create/saveDraft (берёт
  // user.phones.find(isPrimary)) — а вот для только что добавленного через
  // модалку номера (он ещё не основной, см. FormAddPhone) фолбэк тоже не
  // срабатывал, и публикация падала с "Укажите номер телефона для связи".
  if (values.phone) formData.append('phone', values.phone)

  if (values.lat !== undefined) formData.append('lat', String(values.lat))
  if (values.lng !== undefined) formData.append('lng', String(values.lng))

  if (values.region) formData.append('region', values.region)
  if (values.regionIsoCode) formData.append('regionIsoCode', values.regionIsoCode)
  if (values.locality) formData.append('locality', values.locality)
  if (values.localityFiasId) formData.append('localityFiasId', values.localityFiasId)

  if (values.categoryFeatures) {
    formData.append('features', JSON.stringify(values.categoryFeatures))
  }

  return formData
}
