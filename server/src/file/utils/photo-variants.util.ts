// Уменьшенные копии фото объявлений и фото в чатах. Оригинал (до 2000 px, JPEG) нужен
// только для просмотра на весь экран с увеличением — в ленте, списках и
// галерее грузить его — лишние мегабайты на мобильном интернете. Копии
// делаются один раз при загрузке фото и лежат в S3 рядом с оригиналом, по
// ключу, который выводится из ключа оригинала:
//
//   ads/1712345678901-123456789.jpg → ads/1712345678901-123456789_800.webp
//   ads/1712345678901-123456789.png → ads/1712345678901-123456789_800.webp
//
// Кроме них у каждого фото есть квадратная копия для карточек ленты —
// «…_card.webp» (см. PHOTO_CARD_SIZE).
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

// Квадратная копия для карточек ленты. Карточка квадратная и показывает фото
// с обрезкой по центру (object-cover), поэтому копия по большей стороне
// (400/800) ей не подходит: у кадра 3:2 по короткой стороне в ней всего 267
// px, у 16:9 — 225, и на экране она получается мягкой. Здесь копия сразу
// обрезана по центру до квадрата и ничего лишнего не несёт: 600 px хватает и
// карточке 260 px на обычном мониторе, и на экране с плотностью 2–3 (карточка
// 180–260 CSS-px). Качество выше, чем у остальных копий: файл маленький, и
// артефакты сжатия на нём заметнее.
export const PHOTO_CARD_SIZE = 600
export const PHOTO_CARD_QUALITY = 82

// Ключи фото объявлений и чатов: имя, которое даёт FileService
// (время-случайное число), в папке ads или chat. Сейчас оригинал всегда JPEG, но фото, загруженные
// до перекодирования, лежат с исходным расширением (png, webp, …) —
// копии делаются и для них. Сами копии («…_800.webp») под правило не
// попадают: после числа у них «_». Аватары и документы копий не имеют.
const PHOTO_KEY_PATTERN = /^((?:ads|chat)\/\d+-\d+)\.(?:jpe?g|png|webp|gif)$/i

export const hasPhotoVariants = (key: string): boolean => PHOTO_KEY_PATTERN.test(key)

export const photoVariantKey = (key: string, size: PhotoVariantSize): string => {
  const match = PHOTO_KEY_PATTERN.exec(key)

  if (!match) throw new Error(`У объекта ${key} нет уменьшенных копий`)

  return `${match[1]}_${size}.webp`
}

export const photoCardKey = (key: string): string => {
  const match = PHOTO_KEY_PATTERN.exec(key)

  if (!match) throw new Error(`У объекта ${key} нет уменьшенных копий`)

  return `${match[1]}_card.webp`
}

// Все копии фото (по размерам и квадратная); для остальных объектов —
// пустой список.
export const photoVariantKeys = (key: string): string[] =>
  hasPhotoVariants(key) ? [...PHOTO_VARIANT_SIZES.map(size => photoVariantKey(key, size)), photoCardKey(key)] : []
