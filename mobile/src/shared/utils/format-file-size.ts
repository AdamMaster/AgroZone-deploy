// Размер файла по-человечески — «2.4 МБ», «180 КБ», как formatFileSize сайта.
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
