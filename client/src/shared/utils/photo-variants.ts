import type { ImageLoader } from 'next/image'

// Уменьшенные копии фото объявлений и чатов, которые делает сервер
// (server/src/file/utils/photo-variants.util.ts): рядом с оригиналом
// «ads/<время>-<число>.<расширение>» лежат «…_400.webp», «…_800.webp»,
// «…_1280.webp» (размер — по большей стороне). Правило менять только вместе
// с сервером и с mobile/src/shared/utils/photo-variants.ts.
const PHOTO_VARIANT_SIZES = [400, 800, 1280] as const

export type PhotoVariantSize = (typeof PHOTO_VARIANT_SIZES)[number]

const PHOTO_URL_PATTERN = /(\/(?:ads|chat)\/\d+-\d+)\.(?:jpe?g|png|webp|gif)$/i

// Есть ли у фото готовые копии: только у снимков, загруженных через
// FileService объявлений и чатов. Аватары, документы и чужие картинки копий
// не имеют.
export const hasPhotoVariants = (url: string): boolean => PHOTO_URL_PATTERN.test(url)

// Квадратная копия для карточек ленты («…_card.webp», 600×600, обрезка по
// центру, как у object-cover карточки): фото в ней уже готово к показу, поэтому
// отдельных размеров под ширину экрана не нужно. У фото без копий — сама ссылка.
export const photoCardUrl = (url: string): string =>
  hasPhotoVariants(url) ? url.replace(PHOTO_URL_PATTERN, '$1_card.webp') : url

// Самая маленькая копия, которой хватает под запрошенную ширину; шире
// самой большой — самая большая.
const pickVariantSize = (width: number): PhotoVariantSize =>
  PHOTO_VARIANT_SIZES.find(size => size >= width) ?? PHOTO_VARIANT_SIZES[PHOTO_VARIANT_SIZES.length - 1]

// Ссылка на копию нужного размера; у фото без копий — сама ссылка.
export const photoVariantUrl = (url: string, size: PhotoVariantSize): string =>
  hasPhotoVariants(url) ? url.replace(PHOTO_URL_PATTERN, `$1_${size}.webp`) : url

// Loader для next/image: вместо перекодирования на нашем сервере
// (/_next/image) берёт готовую копию прямо из хранилища. Подключать только
// для фото, у которых hasPhotoVariants — см. AdPhoto.
export const photoLoader: ImageLoader = ({ src, width }) => photoVariantUrl(src, pickVariantSize(width))
