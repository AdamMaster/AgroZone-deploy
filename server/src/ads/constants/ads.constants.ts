import { AdStatus } from '@/generated/prisma/client'

export const AD_LIMITS = {
  REGULAR: 5,
  PREMIUM: 15
}

export const AD_MAX_FILE_SIZE = 10 * 1024 * 1024

// Объявления в этих статусах «живые»: видны покупателям (PUBLISHED) или
// проходят модерацию (PENDING). Владелец не может удалить их напрямую — сначала
// их нужно снять с публикации (в архив), и только оттуда удалять. Это
// защищает от случайного удаления опубликованного объявления вместе с
// просмотрами, избранным и оплаченными услугами. Удаление админом
// (AdsService.removeByAdmin) этим правилом не ограничено.
export const AD_STATUSES_BLOCKING_OWNER_REMOVAL: readonly AdStatus[] = [AdStatus.PUBLISHED, AdStatus.PENDING]
