// Content-Disposition: inline — браузер показывает файл сам (PDF во
// встроенном просмотрщике), attachment — скачивает. В обоих случаях — под
// понятным пользователю именем.
// Имя от клиента в заголовок как есть не попадает: кавычки, переводы строк
// и прочее, что может сломать заголовок, убираются, а расширение — то, что
// определено по содержимому файла (а не то, что было в имени у клиента).
// Русские буквы передаются через filename* (RFC 5987), для старых клиентов
// рядом — ASCII-вариант имени.
export function contentDisposition(type: 'inline' | 'attachment', originalName: string, extension: string): string {
  const base =
    originalName
      .replace(/\.[^.]*$/, '')
      // Управляющие символы, кавычки, слэши и т. п. — ничего такого в имени файла не нужно.
      .replace(/[\u0000-\u001f\u007f"\\/:*?<>|;]/g, '')
      .trim()
      .slice(0, 100) || 'file'
  const fileName = `${base}.${extension}`
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, '_')

  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
