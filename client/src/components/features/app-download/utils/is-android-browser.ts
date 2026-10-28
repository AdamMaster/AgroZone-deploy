// Открыт ли сайт в обычном мобильном браузере на Android. Только в этом случае
// предлагаем поставить приложение: на iOS его нет, на компьютере оно не нужно,
// а внутри WebView (в том числе самого приложения или мессенджеров, "wv" в
// User-Agent) призыв «установите приложение» выглядел бы странно.
//
// Вызывать только на клиенте (после монтирования): на сервере navigator нет.
export function isAndroidBrowser(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent

  return /Android/i.test(ua) && !/;\s*wv\)/i.test(ua)
}

// Сайт добавлен на главный экран как PWA — приложение там уже «установлено».
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false

  return window.matchMedia('(display-mode: standalone)').matches
}
