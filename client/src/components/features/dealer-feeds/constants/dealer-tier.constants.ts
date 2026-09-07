import { DealerTier } from '../types/dealer-feed.types'

// Зеркало DEALER_TIER_PRICE_KOPECKS/DEALER_TIER_LIMITS на бэкенде
// (server/src/dealer-feeds/constants/dealer-feeds.constants.ts) — цены
// там плейсхолдеры, ждут финальных цифр от владельца, тут та же цифра
// исключительно чтобы показать пользователю корректную сумму ДО оплаты
// (реальная сумма списания всегда считается на сервере, см.
// DealerSubscriptionsService.createCheckout — клиент её не передаёт).
export const DEALER_TIER_LABELS: Record<DealerTier, string> = {
  UP_TO_20: 'До 20 позиций',
  UP_TO_100: 'До 100 позиций',
  UNLIMITED: 'Без ограничений'
}

export const DEALER_TIER_PRICE_RUB: Record<DealerTier, number> = {
  UP_TO_20: 1999,
  UP_TO_100: 3499,
  UNLIMITED: 5999
}

export const DEALER_TIER_ORDER: DealerTier[] = ['UP_TO_20', 'UP_TO_100', 'UNLIMITED']

export const DEALER_SUBSCRIPTION_DURATION_DAYS = 30
