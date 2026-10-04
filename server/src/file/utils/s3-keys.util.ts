// Папки бакета, в которые приложение само загружает файлы (см. вызовы
// FileService.uploadFile). Всё, что лежит вне этих папок, приложению не
// принадлежит — например, ручные загрузки через панель Selectel, — и
// обслуживающие скрипты такие объекты не трогают.
export const S3_UPLOAD_FOLDERS = ['ads', 'avatars', 'presentations'] as const

export interface S3UrlContext {
  // S3_PUBLIC_URL — публичный домен бакета (текущий формат ссылок).
  publicUrl: string
  // S3_BUCKET_NAME — нужен для старого формата ссылок endpoint/bucket/key.
  bucketName: string
}

export interface S3ObjectInfo {
  key: string
  size: number
  lastModified: Date
}

// Достаёт ключ объекта в бакете из ссылки, которая хранится в БД
// (User.picture, Ad.images и т.д.). Возвращает null, если ссылка не наша —
// например, аватар из Яндекс OAuth или ссылка на сторонний сайт.
//
// Текущий формат (см. FileService.uploadFile) — ссылка на публичный домен
// бакета, имени бакета в пути нет. Старый формат (Timeweb, и первые
// тестовые загрузки на Selectel) — путь вида endpoint/bucketName/fileId.
export const extractS3Key = (url: string, { publicUrl, bucketName }: S3UrlContext): string | null => {
  const key = url.startsWith(`${publicUrl}/`) ? url.slice(publicUrl.length + 1) : url.split(`${bucketName}/`)[1]

  return key || null
}

// Множество ключей, на которые есть ссылки в БД. Пустые значения и чужие
// ссылки пропускаются.
export const collectReferencedKeys = (urls: Iterable<string | null | undefined>, context: S3UrlContext) => {
  const keys = new Set<string>()

  for (const url of urls) {
    const key = url ? extractS3Key(url, context) : null

    if (key) keys.add(key)
  }

  return keys
}

export const isUploadFolderKey = (key: string) => S3_UPLOAD_FOLDERS.some(folder => key.startsWith(`${folder}/`))

// Объекты бакета, на которые не ссылается ни одна запись в БД.
// olderThan защищает от гонки: файл мог быть загружен прямо сейчас, а
// запись в БД с его ссылкой ещё не сохранена — такие свежие объекты в
// «осиротевшие» не попадают.
export const findOrphanedObjects = (
  objects: S3ObjectInfo[],
  referencedKeys: ReadonlySet<string>,
  olderThan: Date
): S3ObjectInfo[] =>
  objects.filter(
    object =>
      isUploadFolderKey(object.key) &&
      !referencedKeys.has(object.key) &&
      object.lastModified.getTime() < olderThan.getTime()
  )

// Обратная проверка: ссылки в БД, объекта для которых в бакете нет
// (например, файл когда-то удалили, а ссылка осталась). Учитываются только
// ключи из папок приложения.
export const findMissingKeys = (referencedKeys: ReadonlySet<string>, objects: S3ObjectInfo[]): string[] => {
  const existing = new Set(objects.map(object => object.key))

  return [...referencedKeys].filter(key => isUploadFolderKey(key) && !existing.has(key))
}
