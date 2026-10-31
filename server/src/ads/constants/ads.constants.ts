import { AdStatus } from '@/generated/prisma/client'

export const AD_LIMITS = {
  REGULAR: 5,
  PREMIUM: 15
}

export const AD_MAX_FILE_SIZE = 10 * 1024 * 1024

// Минимальная длина обязательных полей — те же числа, что в формах сайта и
// приложения (CreateAdSchema, adFormSchema). Черновик сохраняется и без них,
// а на публикации проверяются (см. getMissingPublishFields).
export const AD_TITLE_MIN_LENGTH = 3
export const AD_DESCRIPTION_MIN_LENGTH = 10
export const AD_ADDRESS_MIN_LENGTH = 5

// Черновики. Лимит защищает от бесконечного накопления (у каждого до 15 фото в
// S3). Черновик, который не меняли AD_DRAFT_RETENTION_DAYS дней, удаляет ночная
// чистка (AdsDraftCleanupWorker), а за AD_DRAFT_EXPIRY_WARNING_DAYS дней до
// этого владельцу уходит предупреждение.
export const AD_DRAFT_LIMIT = 20
export const AD_DRAFT_RETENTION_DAYS = 30
export const AD_DRAFT_EXPIRY_WARNING_DAYS = 3

// Сохранение черновика (запрос с фото): лимит на аккаунт в минуту.
export const AD_DRAFT_THROTTLE = { default: { limit: 15, ttl: 60 * 1000 } }

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
