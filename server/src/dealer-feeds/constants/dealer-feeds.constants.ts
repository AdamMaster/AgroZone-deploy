import { DealerTier } from '@/generated/prisma/client'

// Тарифные планы дилерского фида — по объёму позиций (см. комментарий у
// DealerTier в schema.prisma: аудитория и ценность принципиально другие,
// чем у обычного "Премиум", поэтому и отдельная система оплаты).
//
// Цены и границы — плейсхолдеры, как и PREMIUM_PRICE_KOPECKS /
// AD_BUMP_PRICE_KOPECKS: ждут финальных цифр от владельца. Сейчас взяты
// как разумная отправная точка, отталкиваясь от того, что у Авито
// аналогичная функция (Автозагрузка) стоит от 3000 до 4000 ₽/мес в
// составе "Авито Pro" — то есть заметно дороже нашего личного "Премиум"
// (1499 ₽/30 дней), но мы дополнительно разбиваем по объёму, а не берём
// одну ставку на всех.
export const DEALER_TIER_LIMITS: Record<DealerTier, number | null> = {
  UP_TO_20: 20,
  UP_TO_100: 100,
  // null — без ограничения по количеству позиций в фиде.
  UNLIMITED: null
}

export const DEALER_TIER_PRICE_KOPECKS: Record<DealerTier, number> = {
  UP_TO_20: 199900,
  UP_TO_100: 349900,
  UNLIMITED: 599900
}

export const DEALER_SUBSCRIPTION_DURATION_DAYS = 30

// Ограничения на сам фид как файл/ресурс — независимо от тарифа, защита
// от аномального/вредоносного файла по ссылке (см. обсуждение защиты от
// спама/мошенничества через массовый импорт).
export const DEALER_FEED_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20 МБ
export const DEALER_FEED_FETCH_TIMEOUT_MS = 15_000
export const DEALER_FEED_MAX_OFFERS_HARD_CAP = 5000

// Ограничения на скачивание фотографий из фида (см. обсуждение: свои
// фото перезаливаем в S3, не отдаём напрямую ссылку дилера).
export const DEALER_FEED_MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 МБ, как AD_MAX_FILE_SIZE
export const DEALER_FEED_IMAGE_FETCH_TIMEOUT_MS = 10_000
export const DEALER_FEED_MAX_IMAGES_PER_OFFER = 15 // как AD_LIMITS.PREMIUM

export const DEALER_FEED_ALLOWED_IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Как часто DealerFeedSyncWorker перечитывает фиды дилеров — см. там же.
export const DEALER_FEED_SYNC_INTERVAL_HOURS = 4

// Сколько ошибок по позициям хранить в DealerFeed.lastSyncItemErrors —
// как и PREVIEW_ERROR_SAMPLE_SIZE в предпросмотре, чтобы не раздувать
// JSON-колонку на фиде с сотнями однотипных ошибок разом.
export const SYNC_ERROR_SAMPLE_SIZE = 200
