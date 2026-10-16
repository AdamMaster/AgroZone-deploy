// Уменьшенные копии фото объявлений и фото в чатах, которые делает сервер
// (server/src/file/utils/photo-variants.util.ts): рядом с оригиналом
// «ads/<время>-<число>.<расширение>» (у фото чата — «chat/…») лежат «…_400.webp», «…_800.webp»,
// «…_1280.webp» (размер — по большей стороне) и квадратная «…_card.webp»
// (600×600, обрезка по центру) для квадратных карточек ленты. Сейчас оригинал всегда JPEG,
// у фото, загруженных раньше, — исходное расширение (png, webp, …). Правило
// менять только вместе с сервером.
export type PhotoSize = 400 | 800 | 1280 | 'card' | 'original'

const PHOTO_URL_PATTERN = /(\/(?:ads|chat)\/\d+-\d+)\.(?:jpe?g|png|webp|gif)$/i

// Ссылка на копию нужного размера; у фото без копий (не из нашего
// хранилища) — сама ссылка.
export function photoUrl(url: string, size: PhotoSize): string {
  if (size === 'original') return url

  return PHOTO_URL_PATTERN.test(url) ? url.replace(PHOTO_URL_PATTERN, `$1_${size}.webp`) : url
}
