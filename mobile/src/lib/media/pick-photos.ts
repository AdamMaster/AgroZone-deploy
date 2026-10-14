import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'

import type { UploadFile } from '@/lib/api/upload-file'

// Сжатие перед загрузкой — как IMAGE_COMPRESSION сайта (для фото объявлений
// и сообщений чата одинаково): 2048 px по большей
// стороне хватает и карточке, и полноэкранному просмотру; небольшие файлы
// подходящего формата не перекодируются.
const MAX_DIMENSION = 2048
const JPEG_QUALITY = 0.85
const SKIP_BELOW_BYTES = 500 * 1024
const KEPT_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const baseName = (fileName: string | null | undefined, index: number) =>
  fileName?.replace(/\.[^.]+$/, '') || `photo-${Date.now()}-${index}`

// В вебе загрузчику нужен File, а сжатый снимок — ссылка на blob.
async function toWebFile(uri: string, name: string, mimeType: string): Promise<File | undefined> {
  if (Platform.OS !== 'web') return undefined

  const blob = await (await fetch(uri)).blob()
  return new File([blob], name, { type: mimeType })
}

async function compressPhoto(asset: ImagePicker.ImagePickerAsset, index: number): Promise<UploadFile> {
  const needsResize = Math.max(asset.width, asset.height) > MAX_DIMENSION
  const isKeptFormat = !!asset.mimeType && KEPT_MIME_TYPES.has(asset.mimeType)
  const isSmall = asset.fileSize !== undefined && asset.fileSize <= SKIP_BELOW_BYTES

  if (!needsResize && isKeptFormat && isSmall) {
    return {
      uri: asset.uri,
      name: asset.fileName ?? `${baseName(null, index)}.jpg`,
      mimeType: asset.mimeType!,
      webFile: asset.file
    }
  }

  // Остальное — в JPEG: заодно HEIC с iPhone становится форматом, который
  // принимает сервер.
  const context = ImageManipulator.manipulate(asset.uri)
  if (needsResize) {
    context.resize(asset.width >= asset.height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION })
  }

  const image = await context.renderAsync()

  try {
    const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG })
    const name = `${baseName(asset.fileName, index)}.jpg`

    return {
      uri: saved.uri,
      name,
      mimeType: 'image/jpeg',
      webFile: await toWebFile(saved.uri, name, 'image/jpeg')
    }
  } finally {
    image.release()
    context.release()
  }
}

// Фото из галереи (объявление, сообщение чата) — сразу несколько, в порядке выбора. Сжимаем
// по одному: распаковка нескольких 12-мегапиксельных снимков разом может не
// поместиться в память слабого телефона. null — пользователь передумал.
export async function pickPhotos(limit: number): Promise<UploadFile[] | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1
  })

  if (result.canceled) return null

  const files: UploadFile[] = []
  for (const [index, asset] of result.assets.slice(0, limit).entries()) {
    files.push(await compressPhoto(asset, index))
  }

  return files
}

// Пользователь не дал доступ к камере — сообщение для показа как есть.
export class CameraPermissionError extends Error {
  constructor() {
    super('Нет доступа к камере. Разрешите его в настройках телефона')
    this.name = 'CameraPermissionError'
  }
}

// Снимок с камеры — одно фото, сжимается так же, как выбранные из галереи.
// null — пользователь закрыл камеру, не сделав снимок.
export async function takePhoto(): Promise<UploadFile[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) throw new CameraPermissionError()

  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
  if (result.canceled || !result.assets[0]) return null

  return [await compressPhoto(result.assets[0], 0)]
}
