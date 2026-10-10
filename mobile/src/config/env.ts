// Единственное место, где читаются переменные окружения приложения.
//
// Metro подставляет EXPO_PUBLIC_* в бандл только при прямом обращении вида
// process.env.EXPO_PUBLIC_X (без деструктуризации и динамических ключей),
// поэтому каждую переменную читаем явно.
//
// Отсутствующая переменная — ошибка сборки, а не повод молча ходить на
// какой-то адрес по умолчанию: приложение, собранное без .env, должно упасть
// сразу при запуске, а не отправлять запросы не туда.
function requireUrl(name: string, value: string | undefined): string {
  // Убираем завершающий слэш, чтобы пути вида `${API_URL}/ads` не
  // превращались в `//ads`.
  return requireValue(name, value).replace(/\/+$/, '')
}

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name} — см. mobile/.env.example`)
  }

  return value
}

export const API_URL = requireUrl('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL)

// Адрес сайта: страницы правил (политика, соглашение) и домен, от имени
// которого показывается Яндекс-капча (ключ капчи привязан к домену сайта).
export const SITE_URL = requireUrl('EXPO_PUBLIC_SITE_URL', process.env.EXPO_PUBLIC_SITE_URL)

// Публичный (клиентский) ключ Яндекс SmartCaptcha — тот же, что
// NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY у сайта. Секретный ключ живёт только
// на сервере.
export const YANDEX_CAPTCHA_SITEKEY = requireValue(
  'EXPO_PUBLIC_YANDEX_CAPTCHA_SITEKEY',
  process.env.EXPO_PUBLIC_YANDEX_CAPTCHA_SITEKEY
)

// Публичный ключ подсказок адресов DaData — тот же, что
// NEXT_PUBLIC_DADATA_KEY у сайта (ключ для браузера, секрета в нём нет).
export const DADATA_API_KEY = requireValue('EXPO_PUBLIC_DADATA_KEY', process.env.EXPO_PUBLIC_DADATA_KEY)
