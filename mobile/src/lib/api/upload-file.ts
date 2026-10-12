// Файл, выбранный в галерее или в файлах телефона, — для отправки на
// сервер multipart/form-data.
export interface UploadFile {
  uri: string
  name: string
  mimeType: string
  // В веб-сборке выбиратели отдают настоящий File — его и отправляем.
  webFile?: File
}

// На телефоне fetch читает файл сам по uri: в FormData кладётся описание
// {uri, name, type} (так устроен FormData в React Native, отсюда
// приведение типа), в вебе — сам File.
export function appendFile(form: FormData, field: string, file: UploadFile): void {
  if (file.webFile) {
    form.append(field, file.webFile, file.name)
  } else {
    form.append(field, { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob)
  }
}

export function toFileFormData(file: UploadFile, field = 'file'): FormData {
  const form = new FormData()
  appendFile(form, field, file)
  return form
}
