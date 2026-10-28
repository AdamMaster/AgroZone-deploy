import { AdStatus } from '@/generated/prisma/client'

export const AD_LIMITS = {
  REGULAR: 5,
  PREMIUM: 15
}

export const AD_MAX_FILE_SIZE = 10 * 1024 * 1024

// Объявления в этих статусах «живые»: видны покупателям (PUBLISHED),
// проходят модерацию (PENDING) или приостановлены до проверки жалоб
// (SUSPENDED; их вообще нельзя менять, см.
// AdsService.getMutableUserAdOrThrow). Владелец не может удалить их напрямую —
// сначала их нужно снять с публикации (в архив), и только оттуда удалять. Это
// защищает от случайного удаления опубликованного объявления вместе с
// просмотрами, избранным и оплаченными услугами. Удаление админом
// (AdsService.removeByAdmin) этим правилом не ограничено.
export const AD_STATUSES_BLOCKING_OWNER_REMOVAL: readonly AdStatus[] = [
  AdStatus.PUBLISHED,
  AdStatus.PENDING,
  AdStatus.SUSPENDED
]
