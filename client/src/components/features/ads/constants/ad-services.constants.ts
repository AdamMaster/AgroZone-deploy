import { AdBadge, AdServiceType } from '../types/ad.types'

// Дублирует константы бэкенда (server/src/ad-services/constants/ad-services.constants.ts)
// — цена и срок тут нужны только для отображения на странице "Поднять
// просмотры". Реальная сумма всегда считается и проверяется сервером (см.
// AdServicesService.createCheckout), от клиента она не принимается.
export const AD_SERVICE_DURATION_DAYS = 7

export const AD_SERVICE_PRICES_KOPECKS: Record<AdServiceType, number> = {
  BUMP: 14900,
  PRICE_HIGHLIGHT: 14900,
  BADGE: 14900
}

export const AD_SERVICE_LABELS: Record<AdServiceType, string> = {
  BUMP: 'Поднять объявление',
  PRICE_HIGHLIGHT: 'Выделить цену',
  BADGE: 'Добавить значок'
}

export const AD_SERVICE_DESCRIPTIONS: Record<AdServiceType, string> = {
  BUMP: 'Объявление каждый день само поднимается в топ каталога',
  PRICE_HIGHLIGHT: 'Цена в объявлении выделяется цветом и заметнее в каталоге',
  BADGE: 'На объявлении и в каталоге появляется выбранный значок'
}

export const AD_BADGE_LABELS: Record<AdBadge, string> = {
  URGENT: 'Срочно',
  NEGOTIABLE: 'Торг уместен',
  NEW: 'Новинка'
}

export const AD_BADGE_LIST: AdBadge[] = ['URGENT', 'NEGOTIABLE', 'NEW']

export const AD_BADGE_STYLES: Record<AdBadge, string> = {
  URGENT: 'bg-red-500 text-white',
  NEGOTIABLE: 'bg-blue-400 text-white',
  NEW: 'bg-lime-300'
}

export const AD_PRICE_HIGHLIGHT_CLASS = 'rounded bg-amber-200 px-1.5 dark:text-neutral-900'
