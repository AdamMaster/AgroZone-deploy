import { BadRequestException } from '@nestjs/common'
import sharp from 'sharp'

// Форматы, которые принимаем на входе. Определяются по содержимому файла
// (sharp читает сигнатуру/заголовок), а не по имени и не по mimetype из
// запроса — их присылает клиент, и подделать их ничего не стоит.
const ALLOWED_INPUT_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif'])

export interface ProcessImageOptions {
  // Максимальная длина большей стороны результата, px. Меньшие картинки не
  // растягиваются.
  maxDimension: number
  // Качество JPEG, 1..100.
  quality: number
  // Имя файла из запроса — только для текста ошибки.
  fileName?: string
}

export interface ProcessedImage {
  buffer: Buffer
  mimetype: 'image/jpeg'
  extension: 'jpg'
}

export const PHOTO_IMAGE_OPTIONS = { maxDimension: 2000, quality: 82 } as const
export const AVATAR_IMAGE_OPTIONS = { maxDimension: 1024, quality: 85 } as const

// Защита от «бомб декомпрессии»: маленький файл, который при распаковке
// занимает гигабайты. 64 мегапикселя — это 8000 × 8000, заведомо больше
// любого фото с телефона.
const MAX_INPUT_PIXELS = 64_000_000

// Одновременно обрабатываем не больше двух картинок: объявление может нести
// до 15 фото, а каждая распаковка занимает сотни МБ памяти на самом большом
// допустимом размере.
const MAX_CONCURRENT = 2

let active = 0
const waiting: Array<() => void> = []

const acquire = async () => {
  if (active < MAX_CONCURRENT) {
    active += 1
    return
  }

  await new Promise<void>(resolve => waiting.push(resolve))
}

const release = () => {
  const next = waiting.shift()

  if (next) {
    next()
    return
  }

  active -= 1
}

// Проверяет, что файл — настоящая картинка, и перекодирует её в чистый JPEG:
//  - поворачивает по EXIF-ориентации (фото с телефона иначе «лежат»);
//  - уменьшает до maxDimension и пережимает;
//  - убирает все метаданные, включая GPS-координаты места съёмки;
//  - заливает прозрачность белым (у JPEG нет альфа-канала).
// Всё, что не является jpeg/png/webp/gif (HTML, SVG, архив под видом .jpg),
// отклоняется с BadRequestException. Анимированный GIF превращается в
// статичный кадр.
export async function processImage(buffer: Buffer, options: ProcessImageOptions): Promise<ProcessedImage> {
  const label = options.fileName ? `«${options.fileName}»` : 'Файл'
  const notImageError = new BadRequestException(
    `${label} не является изображением. Загрузите фото в формате JPG, PNG или WebP.`
  )

  await acquire()

  try {
    const image = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
    const metadata = await image.metadata()

    if (!metadata.format || !ALLOWED_INPUT_FORMATS.has(metadata.format)) {
      throw notImageError
    }

    const output = await image
      .rotate()
      .resize({ width: options.maxDimension, height: options.maxDimension, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: options.quality, mozjpeg: true })
      .toBuffer()

    return { buffer: output, mimetype: 'image/jpeg', extension: 'jpg' }
  } catch (error) {
    if (error instanceof BadRequestException) throw error

    // Повреждённый файл, слишком большое разрешение или не картинка вовсе —
    // для пользователя это одно и то же: загрузить этот файл нельзя.
    throw notImageError
  } finally {
    release()
  }
}
