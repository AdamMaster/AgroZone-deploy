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

// Срок хранения журнала показа номера (AdPhoneReveal). Журнал нужен, чтобы
// проверить, что автор отзыва или жалобы на продавца действительно
// контактировал с ним; спустя год такой контакт уже мало что подтверждает, а
// хранить данные «кто чей телефон открывал» дольше нужного не стоит (152-ФЗ).
// Старше срока записи удаляет ночная чистка (AdPhoneRevealsRetentionWorker).
// Если меняете срок — обновите и Политику конфиденциальности (/privacy,
// раздел про сроки хранения).
export const AD_PHONE_REVEALS_RETENTION_DAYS = 365
