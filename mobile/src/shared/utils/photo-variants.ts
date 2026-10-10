// Уменьшенные копии фото объявлений, которые сервер делает при загрузке
// (server/src/file/utils/photo-variants.util.ts): рядом с оригиналом
// «ads/<время>-<число>.jpg» лежат «…_400.webp», «…_800.webp», «…_1280.webp»
// (размер — по большей стороне). Правило менять только вместе с сервером.
export type PhotoSize = 400 | 800 | 1280 | 'original'

const AD_PHOTO_URL_PATTERN = /(\/ads\/\d+-\d+)\.jpg$/

// Ссылка на копию нужного размера; у фото без копий (не из нашего
// хранилища) — сама ссылка.
export function photoUrl(url: string, size: PhotoSize): string {
  if (size === 'original') return url

  return AD_PHOTO_URL_PATTERN.test(url) ? url.replace(AD_PHOTO_URL_PATTERN, `$1_${size}.webp`) : url
}
