import { SellerReviewFilterFlag, SellerReviewStatus } from '@/generated/prisma/enums'

export interface ReviewStatusInput {
  // Статус отзыва до изменения; у нового отзыва — null.
  current: SellerReviewStatus | null
  // Флаги автофильтра для текущего текста.
  flags: SellerReviewFilterFlag[]
  // Есть ли нерассмотренные жалобы на отзыв.
  hasPendingReports: boolean
}

// Какой статус получает отзыв при создании или правке текста.
//
// Срабатывание фильтра отправляет отзыв на проверку. Отзыв, уже
// задержанный по жалобам, остаётся на проверке, пока модератор не рассмотрит
// их: исправлением текста от жалоб не уйти. Во всех остальных случаях —
// публикация (в том числе когда автор исправил текст, задержанный
// фильтром). Скрытый отзыв сюда не попадает: правка закрыта для него ещё
// до вызова.
export function resolveReviewStatus({ current, flags, hasPendingReports }: ReviewStatusInput): SellerReviewStatus {
  const heldByReports = current === SellerReviewStatus.PENDING && hasPendingReports

  return flags.length > 0 || heldByReports ? SellerReviewStatus.PENDING : SellerReviewStatus.PUBLISHED
}
