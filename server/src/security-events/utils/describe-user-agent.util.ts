// Короткая человекочитаемая подпись устройства из User-Agent, например
// "Chrome · Windows" или "Safari · iOS". Нужна, чтобы в журнале (и в
// админке) было видно "это новый браузер/телефон", а не простыня
// "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...".
//
// Намеренно без внешней библиотеки: для этой задачи не нужна точная версия
// браузера, достаточно семейства браузера и ОС. Порядок проверок ВАЖЕН:
// почти все браузеры в UA называют себя "Chrome" и "Safari" одновременно
// (Edge, Opera, Яндекс — это Chromium), поэтому специфичные метки идут
// раньше общих.
const BROWSERS: Array<[RegExp, string]> = [
  [/EdgA?\/|EdgiOS\/|Edge\//i, 'Edge'],
  [/OPR\/|Opera/i, 'Opera'],
  [/YaBrowser\//i, 'Yandex Browser'],
  [/SamsungBrowser\//i, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//i, 'Firefox'],
  [/Chrome\/|CriOS\//i, 'Chrome'],
  [/Safari\//i, 'Safari']
]

// iPhone/iPad проверяются раньше macOS: их UA содержит "like Mac OS X".
// Android — раньше Linux по той же причине ("Linux; Android ...").
const SYSTEMS: Array<[RegExp, string]> = [
  [/iPhone|iPad|iPod/i, 'iOS'],
  [/Android/i, 'Android'],
  [/Windows/i, 'Windows'],
  [/CrOS/i, 'ChromeOS'],
  [/Macintosh|Mac OS X/i, 'macOS'],
  [/Linux|X11/i, 'Linux']
]

// "bot\b", а не просто "bot": иначе под бота попадали бы бренды телефонов вроде
// "Cubot" (в UA "Cubot_X30" после "bot" идёт "_", то есть не граница слова),
// а Googlebot/bingbot ("bot/2.1") — по-прежнему ловятся.
const BOT_PATTERN = /bot\b|crawler|spider|crawling/i

export function describeUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) {
    return null
  }

  if (BOT_PATTERN.test(userAgent)) {
    return 'Bot'
  }

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1]
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1]

  const parts = [browser, system].filter((part): part is string => Boolean(part))

  return parts.length ? parts.join(' · ') : null
}
