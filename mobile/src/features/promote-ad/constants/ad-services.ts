import type { AdBadge } from '@/features/ads/types/ad.types'

import type { AdServiceType } from '../types/promote-ad.types'

// Дублирует константы сервера (server/src/ad-services/constants/
// ad-services.constants.ts) и сайта (client/.../ad-services.constants.ts):
// цена и срок нужны только для показа. Реальную сумму всегда считает и
// проверяет сервер, из приложения она не принимается. Поменяли цену на
// сервере — поменяйте здесь и на сайте, иначе экран покажет одну сумму, а
// ЮKassa попросит другую.
export const AD_SERVICE_DURATION_DAYS = 7

// В копейках, как на сервере.
export const AD_SERVICE_PRICES_KOPECKS: Readonly<Record<AdServiceType, number>> = {
  BUMP: 14800,
  PRICE_HIGHLIGHT: 14800,
  BADGE: 14800
}

// Порядок — как на странице сайта.
export const AD_SERVICES: readonly AdServiceType[] = ['BUMP', 'PRICE_HIGHLIGHT', 'BADGE']

export const AD_SERVICE_LABELS: Readonly<Record<AdServiceType, string>> = {
  BUMP: 'Поднять объявление',
  PRICE_HIGHLIGHT: 'Выделить цену',
  BADGE: 'Добавить значок'
}

export const AD_SERVICE_DESCRIPTIONS: Readonly<Record<AdServiceType, string>> = {
  BUMP: 'Объявление каждый день само поднимается в топ каталога',
  PRICE_HIGHLIGHT: 'Цена в объявлении выделяется цветом и заметнее в каталоге',
  BADGE: 'На объявлении и в каталоге появляется выбранный значок'
}

// Услуги, которые уже входят в премиум-аккаунт продавца: покупать отдельно
// не нужно (как на сайте).
export const PREMIUM_COVERED_SERVICES: readonly AdServiceType[] = ['BUMP', 'PRICE_HIGHLIGHT']

// Значок, выбранный сразу при включении услуги, если у объявления его ещё
// нет — как на сайте.
export const DEFAULT_AD_BADGE: AdBadge = 'URGENT'
