import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { toast } from 'sonner-native'

import type { UploadFile } from '@/lib/api/upload-file'

// Ограничения — те же, что проверяет сервер (UserController): проверяем
// заранее, чтобы не гонять по мобильной сети файл, который всё равно не
// примут, и показать понятную причину.
const AVATAR_MAX_SIZE = 5 * 1024 * 1024
const AVATAR_MIME_TYPES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
}

const PRESENTATION_MAX_SIZE = 15 * 1024 * 1024
const PRESENTATION_MIME_TYPES: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

// Файл не подходит под ограничения — сообщение для пользователя.
export class InvalidFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidFileError'
  }
}

const extensionOf = (name: string | null | undefined): string => name?.split('.').pop()?.toLowerCase() ?? ''

// Тип файла: по mimeType от выбирателя, а если его нет — по расширению.
function resolveMimeType(
  mimeType: string | undefined,
  name: string | null | undefined,
  allowed: Readonly<Record<string, string>>
): string | null {
  const allowedTypes = Object.values(allowed)
  if (mimeType && allowedTypes.includes(mimeType)) return mimeType

  return allowed[extensionOf(name)] ?? null
}

// Фото профиля из галереи, сразу обрезанное в квадрат. null — пользователь
// передумал. На Android 13+ и iOS системная галерея не требует разрешения.
export async function pickAvatarImage(): Promise<UploadFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    // Меньше 1 — система отдаёт сжатый JPEG, а не HEIC, который сервер не
    // принимает.
    quality: 0.85
  })

  const asset = result.canceled ? undefined : result.assets[0]
  if (!asset) return null

  const mimeType = resolveMimeType(asset.mimeType, asset.fileName, AVATAR_MIME_TYPES)
  if (!mimeType) throw new InvalidFileError('Выберите фото в формате JPEG, PNG или WEBP')
  if (asset.fileSize !== undefined && asset.fileSize > AVATAR_MAX_SIZE) {
    throw new InvalidFileError('Размер фото не должен превышать 5 МБ')
  }

  const extension = Object.keys(AVATAR_MIME_TYPES).find(key => AVATAR_MIME_TYPES[key] === mimeType) ?? 'jpg'

  return {
    uri: asset.uri,
    name: asset.fileName ?? `avatar.${extension}`,
    mimeType,
    webFile: asset.file
  }
}

// Презентация компании из файлов телефона: PDF, DOCX, XLSX, PPTX до 15 МБ.
export async function pickPresentationDocument(): Promise<UploadFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: Object.values(PRESENTATION_MIME_TYPES),
    copyToCacheDirectory: true
  })

  const asset = result.canceled ? undefined : result.assets[0]
  if (!asset) return null

  const mimeType = resolveMimeType(asset.mimeType, asset.name, PRESENTATION_MIME_TYPES)
  if (!mimeType) throw new InvalidFileError('Допустимые форматы файла: PDF, DOCX, XLSX, PPTX')
  if (asset.size !== undefined && asset.size > PRESENTATION_MAX_SIZE) {
    throw new InvalidFileError('Размер файла не должен превышать 15 МБ')
  }

  return { uri: asset.uri, name: asset.name, mimeType, webFile: asset.file }
}

// Выбрать файл и передать его дальше (на загрузку). Неподходящий файл или
// сбой системного окна выбора — сообщением, а не падением экрана.
export async function pickFileThen(pick: () => Promise<UploadFile | null>, onPicked: (file: UploadFile) => void) {
  try {
    const file = await pick()
    if (file) onPicked(file)
  } catch (error) {
    toast.error(error instanceof InvalidFileError ? error.message : 'Не удалось открыть выбор файла')
  }
}
