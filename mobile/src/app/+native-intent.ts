// Перенаправление ссылок, которыми систему открывают приложение.
//
// Письмо о смене почты ведёт на https://agro-zone.ru/change-email?token=…
// (страница сайта). В приложении путь /change-email занят формой «Изменить
// почту» (только для вошедшего), поэтому ссылку из письма отправляем на
// отдельный экран подтверждения, открытый и гостю. Остальные ссылки
// проходят как есть.
const SITE_ORIGIN = 'https://agro-zone.ru'

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const url = new URL(path, SITE_ORIGIN)
    const token = url.searchParams.get('token')

    if (url.pathname.replace(/\/$/, '') === '/change-email' && token) {
      return `/confirm-email?token=${encodeURIComponent(token)}`
    }
  } catch {
    // Неразборчивый адрес — оставляем как есть, роутер сам разберётся.
  }

  return path
}
