export interface CompressImageOptions {
  // Максимальная длина большей стороны после сжатия, px. Меньшие картинки
  // не растягиваются.
  maxDimension: number
  // Качество JPEG, 0..1.
  quality: number
  // Картинки не больше этого размера (байт), которым к тому же не нужно
  // уменьшать стороны, остаются как есть — перекодирование уже лёгкого
  // файла только добавит артефактов.
  skipBelowBytes: number
}

const OUTPUT_TYPE = 'image/jpeg'

// GIF и SVG не трогаем: у GIF при перекодировании пропадёт анимация, SVG —
// вектор, для него размер в пикселях не имеет смысла.
const PASSTHROUGH_TYPES = new Set(['image/gif', 'image/svg+xml'])

export const getScaledSize = (width: number, height: number, maxDimension: number) => {
  const scale = Math.min(1, maxDimension / Math.max(width, height))

  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export const replaceFileExtension = (fileName: string, extension: string) => {
  const dotIndex = fileName.lastIndexOf('.')
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName

  return `${baseName}.${extension}`
}

const loadImage = (file: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Не удалось прочитать изображение'))
    }
    image.src = url
  })

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, OUTPUT_TYPE, quality))

// Уменьшает и пережимает фото прямо в браузере перед загрузкой. Снимок с
// современного телефона весит 4–12 МБ, а для объявления нужно максимум
// ~2000 px: после сжатия это 300–900 КБ. Меньше трафика и времени отправки
// (важно на слабом мобильном интернете — там тяжёлый запрос чаще всего и
// обрывается), и формы не упираются в лимит размера запроса на сервере.
//
// Ориентацию из EXIF браузер применяет сам при декодировании <img> и
// отрисовке на canvas, поэтому "лежачие" фото с телефона остаются
// правильно повёрнутыми. Прозрачные PNG заливаются белым — у JPEG нет
// альфа-канала, иначе фон стал бы чёрным.
//
// Функция никогда не бросает исключение: если что-то пошло не так (браузер
// не умеет декодировать формат, например HEIC, не хватило памяти) или
// результат не стал легче — возвращается исходный файл, и загрузка идёт как
// раньше.
export async function compressImage(file: File, options: CompressImageOptions): Promise<File> {
  if (!file.type.startsWith('image/') || PASSTHROUGH_TYPES.has(file.type)) return file

  try {
    const image = await loadImage(file)
    const { width, height } = getScaledSize(image.naturalWidth, image.naturalHeight, options.maxDimension)
    const isResized = width < image.naturalWidth

    if (!isResized && file.size <= options.skipBelowBytes) return file

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, options.quality)

    // Сразу освобождаем память под пиксели: Safari держит canvas до сборки
    // мусора, а у фото на 10+ МБ это сотни МБ на слабом телефоне.
    canvas.width = 0
    canvas.height = 0

    if (!blob || blob.size >= file.size) return file

    return new File([blob], replaceFileExtension(file.name, 'jpg'), {
      type: OUTPUT_TYPE,
      lastModified: file.lastModified
    })
  } catch {
    return file
  }
}
