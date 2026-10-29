import { File as ExpoFile } from 'expo-file-system'
import { Platform } from 'react-native'

// Файл, выбранный в галерее или в файлах телефона, — для отправки на
// сервер multipart/form-data.
export interface UploadFile {
  uri: string
  name: string
  mimeType: string
  // В веб-сборке выбиратели отдают настоящий File — его и отправляем.
  webFile?: File
}

// Запрос с фото по мобильной сети идёт дольше обычных 15 секунд: объявление
// (до 15 фото) и сообщение чата (до 5). Но и ждать 3 минуты запрос без
// файлов нельзя: после долгого простоя телефона соединение с сервером
// бывает «мёртвым», запрос просто висит, и пользователь видит бесконечный
// спиннер. Поэтому предел зависит от числа файлов: UPLOAD_TIMEOUT_MS —
// потолок, а не значение по умолчанию.
export const UPLOAD_TIMEOUT_MS = 180_000
const UPLOAD_BASE_TIMEOUT_MS = 20_000
const UPLOAD_PER_FILE_TIMEOUT_MS = 20_000

// Сколько файлов в multipart-теле. В React Native файл в FormData — часть с
// полем uri (см. appendFile); в вебе (только проверка вёрстки) разобрать тело
// нельзя, берём осторожное среднее.
export function countFileParts(form: FormData): number {
  const getParts = (form as unknown as { getParts?: () => object[] }).getParts

  if (typeof getParts !== 'function') return 8

  return getParts.call(form).filter(part => 'uri' in part).length
}

// Предел ожидания запроса: 20 с на сам запрос и по 20 с на каждый файл, но не
// дольше UPLOAD_TIMEOUT_MS.
export function uploadTimeoutMs(form: FormData): number {
  return Math.min(UPLOAD_TIMEOUT_MS, UPLOAD_BASE_TIMEOUT_MS + countFileParts(form) * UPLOAD_PER_FILE_TIMEOUT_MS)
}

// Как файл попадает в multipart-тело.
//
// В Expo SDK 53+ глобальный fetch заменён на expo/fetch, и он НЕ умеет
// отправлять файл по пути на телефоне ({uri, name, type} из FormData React
// Native): на такой части он падает с «Unsupported FormDataPart
// implementation», и запрос не уходит вовсе (в приложении это выглядело как
// «Не удалось связаться с сервером»). Ему нужно содержимое файла: часть с
// методом bytes(), который читает файл с телефона (expo-file-system, File
// реализует Blob). uri, name и type остаются в описании: из name и type
// строятся заголовки части, а uri нужен счётчику файлов (countFileParts).
// В вебе (проверка вёрстки) отправляется настоящий File.
export function appendFile(form: FormData, field: string, file: UploadFile): void {
  if (Platform.OS === 'web' && file.webFile) {
    form.append(field, file.webFile, file.name)
    return
  }

  const part = {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
    bytes: () => new ExpoFile(file.uri).bytes()
  }

  form.append(field, part as unknown as Blob)
}

export function toFileFormData(file: UploadFile, field = 'file'): FormData {
  const form = new FormData()
  appendFile(form, field, file)
  return form
}
