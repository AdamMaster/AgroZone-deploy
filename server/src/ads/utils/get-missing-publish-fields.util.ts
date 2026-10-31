import { AD_ADDRESS_MIN_LENGTH, AD_DESCRIPTION_MIN_LENGTH, AD_TITLE_MIN_LENGTH } from '../constants/ads.constants'

export interface PublishableAdFields {
  title: string
  description: string
  address: string
  phone: string
}

// Что нужно, чтобы объявление можно было отправить на модерацию. Черновик
// сохраняется неполным (пустые описание, адрес, телефон), поэтому полноту
// проверяем при публикации; пороги те же, что в формах сайта и приложения.
const REQUIRED_FIELDS: ReadonlyArray<{ label: string; isFilled: (ad: PublishableAdFields) => boolean }> = [
  { label: 'название', isFilled: ad => ad.title.trim().length >= AD_TITLE_MIN_LENGTH },
  { label: 'описание', isFilled: ad => ad.description.trim().length >= AD_DESCRIPTION_MIN_LENGTH },
  { label: 'адрес', isFilled: ad => ad.address.trim().length >= AD_ADDRESS_MIN_LENGTH },
  { label: 'номер телефона', isFilled: ad => ad.phone.length > 0 }
]

// Названия незаполненных полей (по-русски, для сообщения пользователю);
// пустой список — объявление готово к публикации.
export function getMissingPublishFields(ad: PublishableAdFields): string[] {
  return REQUIRED_FIELDS.filter(field => !field.isFilled(ad)).map(field => field.label)
}
