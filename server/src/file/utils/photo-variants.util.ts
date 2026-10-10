// Уменьшенные копии фото объявлений. Оригинал (до 2000 px, JPEG) нужен
// только для просмотра на весь экран с увеличением — в ленте, списках и
// галерее грузить его — лишние мегабайты на мобильном интернете. Копии
// делаются один раз при загрузке фото и лежат в S3 рядом с оригиналом, по
// ключу, который выводится из ключа оригинала:
//
//   ads/1712345678901-123456789.jpg → ads/1712345678901-123456789_800.webp
//
// Клиент (мобильное приложение) строит ссылку на копию тем же правилом —
// без отдельных полей в ответах API. Правило менять только вместе с
// mobile/src/shared/utils/photo-variants.ts.

// Размер — по большей стороне (как у оригинала, fit: inside):
//  - 400 — строки списков (88×80), миниатюры галереи;
//  - 800 — карточки ленты в две колонки и «Похожие»;
//  - 1280 — галерея на странице объявления во всю ширину экрана.
export const PHOTO_VARIANT_SIZES = [400, 800, 1280] as const

export type PhotoVariantSize = (typeof PHOTO_VARIANT_SIZES)[number]

// WebP заметно легче JPEG того же качества и поддерживается и браузерами,
// и iOS/Android.
export const PHOTO_VARIANT_QUALITY = 78
export const PHOTO_VARIANT_CONTENT_TYPE = 'image/webp'

// Ключи фото объявлений: имя, которое даёт FileService (время-случайное
// число), в папке ads. Аватары и документы копий не имеют.
const AD_PHOTO_KEY_PATTERN = /^(ads\/\d+-\d+)\.jpg$/

export const hasPhotoVariants = (key: string): boolean => AD_PHOTO_KEY_PATTERN.test(key)

export const photoVariantKey = (key: string, size: PhotoVariantSize): string => {
  const match = AD_PHOTO_KEY_PATTERN.exec(key)

  if (!match) throw new Error(`У объекта ${key} нет уменьшенных копий`)

  return `${match[1]}_${size}.webp`
}

// Все копии фото; для остальных объектов — пустой список.
export const photoVariantKeys = (key: string): string[] =>
  hasPhotoVariants(key) ? PHOTO_VARIANT_SIZES.map(size => photoVariantKey(key, size)) : []
