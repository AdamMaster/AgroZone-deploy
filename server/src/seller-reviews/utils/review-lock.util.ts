import { Prisma } from '@/generated/prisma/client'
import { SellerReviewStatus } from '@/generated/prisma/enums'

export interface LockedReview {
  id: string
  sellerId: string
  authorId: string
  status: SellerReviewStatus
}

// Берёт блокировку FOR UPDATE на строку отзыва и отдаёт её актуальное
// состояние. Правка автором, жалобы и решение модератора меняют статус
// отзыва; без общей блокировки решение «скрыть» можно было бы затереть
// одновременной правкой автора. Порядок блокировок везде один: сначала
// отзыв, потом пользователи (SellerRatingService.recalculate) — иначе
// транзакции могли бы ждать друг друга.
export async function lockReview(tx: Prisma.TransactionClient, reviewId: string): Promise<LockedReview | null> {
  const [row] = await tx.$queryRaw<LockedReview[]>`
    SELECT "id", "seller_id" AS "sellerId", "author_id" AS "authorId", "status"
    FROM "seller_reviews"
    WHERE "id" = ${reviewId}
    FOR UPDATE`

  return row ?? null
}
