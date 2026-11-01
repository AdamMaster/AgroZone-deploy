import { loadEsm } from 'load-esm'

// Тип файла по содержимому (сигнатуре), а не по имени и не по Content-Type,
// которые прислал клиент: им верить нельзя. Тот же пакет file-type, что
// использует FileTypeValidator в Nest; он распространяется только как
// ES-модуль, поэтому подключается через load-esm (как и в самом Nest).
export interface DetectedFileType {
  ext: string
  mime: string
}

interface FileTypeModule {
  fileTypeFromBuffer(buffer: Uint8Array): Promise<DetectedFileType | undefined>
}

let fileTypeModule: Promise<FileTypeModule> | undefined

export async function detectFileType(buffer: Uint8Array): Promise<DetectedFileType | undefined> {
  fileTypeModule ??= loadEsm<FileTypeModule>('file-type')

  return (await fileTypeModule).fileTypeFromBuffer(buffer)
}
