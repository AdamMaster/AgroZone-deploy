// Реестр переключателей сайта и приложения. Именно здесь, в коде, а не в
// базе, определено, какие флаги существуют и каково их значение по
// умолчанию: таблица site_settings хранит только переопределения, сделанные
// администратором (см. SiteSetting в schema.prisma). Поэтому новый флаг —
// это одна строка ниже, без миграции и без заполнения базы.
//
// ВАЖНО: каждый флаг из этого реестра отдаётся ВСЕМ клиентам (сайту и
// приложению, в том числе гостям) через GET /site-settings/public — им
// нужно знать, показывать ли функцию. Секреты и настройки, которые не
// должен видеть посетитель, сюда не добавляем.
export const SiteFlagKey = {
  // Система рейтингов и отзывов о продавцах. Выключена, пока на площадке
  // не наберётся достаточно продавцов и трафика: пустые звёзды выглядят
  // хуже, чем их отсутствие. Включает владелец одним нажатием в админке.
  SellerRatings: 'sellerRatings',
  // Все призывы «Скачать приложение» на сайте: баннер для Android-браузеров,
  // ссылки в шапке и подвале. Выключен, пока на площадке мало объявлений:
  // человек, поставивший приложение и не нашедший товар, оставит низкую
  // оценку в RuStore, а первые оценки сильнее всего влияют на средний
  // рейтинг.
  AppDownload: 'appDownload'
} as const

export type SiteFlagKey = (typeof SiteFlagKey)[keyof typeof SiteFlagKey]

export const SITE_FLAG_DEFAULTS: Readonly<Record<SiteFlagKey, boolean>> = {
  [SiteFlagKey.SellerRatings]: false,
  [SiteFlagKey.AppDownload]: false
}

export const SITE_FLAG_KEYS = Object.values(SiteFlagKey)

// Все флаги одним значением: читаются на каждый заход на сайт (SSR) и на
// каждый запуск приложения, а меняются раз в месяцы. TTL — страховка на
// случай, если сброс кеша при смене флага не удался (см.
// SiteSettingsService.invalidateCache): устаревшее значение не живёт дольше
// него.
export const SITE_SETTINGS_CACHE_KEY = 'site-settings:flags'
export const SITE_SETTINGS_CACHE_TTL_SECONDS = 300

// Сколько последних переключений показывает админка.
export const SITE_SETTINGS_HISTORY_LIMIT = 20
