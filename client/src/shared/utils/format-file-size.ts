// Человекочитаемый размер файла — «2.4 МБ», «180 КБ». Нужен там, где
// показываем уже загруженный файл пользователю (см. ContentGeneral —
// презентация компании) и он не может посмотреть исходный File.size сам,
// как при выборе файла на диске: сервер отдаёт готовые байты (см.
// IUser.presentationFileSize), которые где-то надо превратить в текст.
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`

  const units = ['КБ', 'МБ', 'ГБ']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(1).replace(/\.0$/, '')} ${units[unitIndex]}`
}
