import { SiteFlagKey, SiteFlags } from '../types/site-settings.types'

// Что видит посетитель, пока настоящие значения не получены (бэкенд не
// ответил) и там, где провайдера флагов нет вовсе: всё новое выключено.
// Безопасная сторона отказа — функция, которая должна быть скрыта, не
// покажется по ошибке. Значения совпадают с SITE_FLAG_DEFAULTS на бэкенде.
export const DEFAULT_SITE_FLAGS: SiteFlags = {
  [SiteFlagKey.SellerRatings]: false
}

// Как долго Next держит ответ /site-settings/public в Data Cache. Флаг
// читается при каждом показе страницы, а меняется раз в месяцы — отдельный
// запрос к API на каждый рендер ни к чему. Это же и задержка, с которой
// сайт «подхватывает» переключение из админки.
export const SITE_FLAGS_REVALIDATE_SECONDS = 30
