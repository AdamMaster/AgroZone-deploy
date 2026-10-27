import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'

import { SELLER_REVIEW_RECIPROCAL_FACTOR } from './constants/seller-reviews.constants'

interface RatingRow {
  count: number
  average: number | null
}

// Пересчёт рейтинга продавца (User.ratingAverage / ratingCount) по
// опубликованным отзывам. Выполняется в той же транзакции, что и изменение
// отзыва, поэтому рейтинг не расходится с отзывами.
@Injectable()
export class SellerRatingService {
  // Пересчитывает рейтинг каждого из переданных пользователей. Нужно
  // передавать и продавца, и автора изменённого отзыва: если автор сам
  // продавец, то взаимный отзыв о нём меняет вес (см. recalculateOne).
  async recalculate(tx: Prisma.TransactionClient, userIds: string[]): Promise<void> {
    // Блокировка строк пользователей в одном порядке (по id) — одновременные
    // изменения отзывов одного продавца идут по очереди и каждое видит
    // уже зафиксированные результаты предыдущих, а порядок исключает
    // взаимную блокировку при пересчёте пары.
    const ids = [...new Set(userIds)].sort()

    await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`

    for (const id of ids) {
      await this.recalculateOne(tx, id)
    }
  }

  // Взвешенное среднее: sum(оценка × вес) / sum(вес), где вес отзыва —
  // его собственный вес, ослабленный вдвое, если автор отзыва сам получил
  // от этого продавца опубликованный отзыв (взаимная оценка). Среднее
  // округляется до сотых. Опубликованных отзывов нет — рейтинг пустой.
  private async recalculateOne(tx: Prisma.TransactionClient, sellerId: string): Promise<void> {
    const [row] = await tx.$queryRaw<RatingRow[]>`
      SELECT
        COUNT(*)::int AS "count",
        ROUND((SUM(r."rating" * r."weight" * f."factor") / NULLIF(SUM(r."weight" * f."factor"), 0))::numeric, 2)::float8 AS "average"
      FROM "seller_reviews" r
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN EXISTS (
            SELECT 1 FROM "seller_reviews" back
            WHERE back."seller_id" = r."author_id"
              AND back."author_id" = r."seller_id"
              AND back."status" = 'PUBLISHED'
          ) THEN ${SELLER_REVIEW_RECIPROCAL_FACTOR}::float8
          ELSE 1::float8
        END AS "factor"
      ) f
      WHERE r."seller_id" = ${sellerId} AND r."status" = 'PUBLISHED'
    `

    await tx.user.update({
      where: { id: sellerId },
      data: { ratingAverage: row?.average ?? null, ratingCount: row?.count ?? 0 }
    })
  }
}
