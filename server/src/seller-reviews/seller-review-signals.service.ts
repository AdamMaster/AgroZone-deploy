import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'

import {
  SELLER_REVIEW_ESTABLISHED_ACCOUNT_AGE_DAYS,
  SELLER_REVIEW_SIGNAL_BURST_WINDOW_HOURS
} from './constants/seller-reviews.constants'
import { SellerReviewSignalCode, SellerReviewSignalCounts, evaluateReviewSignals } from './utils/review-signals.util'

export interface SellerReviewSignals extends SellerReviewSignalCounts {
  flagged: SellerReviewSignalCode[]
}

// Сигналы возможной накрутки отзывов продавца для модератора. Всё считается
// по уже собранным данным: отзывам, активности аккаунтов и IP из журнала
// событий безопасности. Общий IP — слабый сигнал (мобильные сети и офисы
// дают один адрес многим людям), поэтому он лишь подсвечивается, решение
// принимает человек.
@Injectable()
export class SellerReviewSignalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSignals(sellerId: string): Promise<SellerReviewSignals> {
    const [[totals], [young], [reciprocal], [burst], [sharedWithSeller], [sharedAmongAuthors]] = await Promise.all([
      this.prisma.$queryRaw<{ total: number; unconfirmed: number }[]>`
        SELECT
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE "contact_type" = 'CONTACT')::int AS "unconfirmed"
        FROM "seller_reviews"
        WHERE "seller_id" = ${sellerId} AND "status" <> 'HIDDEN'`,

      // Автор моложе месяца на момент отзыва и без другой активности: ни
      // своих объявлений, ни диалогов с кем-то кроме этого продавца — тот же
      // признак, что снижает вес отзыва (см. computeReviewWeight).
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS "count"
        FROM "seller_reviews" r
        JOIN "users" a ON a."id" = r."author_id"
        WHERE r."seller_id" = ${sellerId}
          AND r."status" <> 'HIDDEN'
          AND r."created_at" - a."created_at" < make_interval(days => ${SELLER_REVIEW_ESTABLISHED_ACCOUNT_AGE_DAYS})
          AND NOT EXISTS (SELECT 1 FROM "ads" WHERE "ads"."user_id" = a."id")
          AND NOT EXISTS (
            SELECT 1 FROM "conversations" c
            WHERE c."type" = 'AD'
              AND ((c."buyer_id" = a."id" AND c."seller_id" <> ${sellerId})
                OR (c."seller_id" = a."id" AND c."buyer_id" <> ${sellerId}))
          )`,

      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS "count"
        FROM "seller_reviews" r
        WHERE r."seller_id" = ${sellerId}
          AND r."status" <> 'HIDDEN'
          AND EXISTS (
            SELECT 1 FROM "seller_reviews" back
            WHERE back."seller_id" = r."author_id"
              AND back."author_id" = r."seller_id"
              AND back."status" <> 'HIDDEN'
          )`,

      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COALESCE(MAX(t."count"), 0)::int AS "count"
        FROM (
          SELECT (
            SELECT COUNT(*) FROM "seller_reviews" r2
            WHERE r2."seller_id" = r1."seller_id"
              AND r2."status" <> 'HIDDEN'
              AND r2."created_at" >= r1."created_at"
              AND r2."created_at" < r1."created_at" + make_interval(hours => ${SELLER_REVIEW_SIGNAL_BURST_WINDOW_HOURS})
          ) AS "count"
          FROM "seller_reviews" r1
          WHERE r1."seller_id" = ${sellerId} AND r1."status" <> 'HIDDEN'
        ) t`,

      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT r."author_id")::int AS "count"
        FROM "seller_reviews" r
        JOIN "user_security_events" ae ON ae."user_id" = r."author_id" AND ae."ip" IS NOT NULL
        WHERE r."seller_id" = ${sellerId}
          AND r."status" <> 'HIDDEN'
          AND ae."ip" IN (
            SELECT "ip" FROM "user_security_events" WHERE "user_id" = ${sellerId} AND "ip" IS NOT NULL
          )`,

      this.prisma.$queryRaw<{ count: number }[]>`
        WITH ips AS (
          SELECT DISTINCT e."user_id", e."ip"
          FROM "user_security_events" e
          WHERE e."ip" IS NOT NULL
            AND e."user_id" IN (
              SELECT "author_id" FROM "seller_reviews" WHERE "seller_id" = ${sellerId} AND "status" <> 'HIDDEN'
            )
        )
        SELECT COUNT(DISTINCT i1."user_id")::int AS "count"
        FROM ips i1
        JOIN ips i2 ON i2."ip" = i1."ip" AND i2."user_id" <> i1."user_id"`
    ])

    const counts: SellerReviewSignalCounts = {
      totalReviews: totals?.total ?? 0,
      unconfirmedReviews: totals?.unconfirmed ?? 0,
      youngAuthorReviews: young?.count ?? 0,
      reciprocalReviews: reciprocal?.count ?? 0,
      maxReviewsInWindow: burst?.count ?? 0,
      authorsSharingIpWithSeller: sharedWithSeller?.count ?? 0,
      authorsSharingIpWithEachOther: sharedAmongAuthors?.count ?? 0
    }

    return { ...counts, flagged: evaluateReviewSignals(counts) }
  }
}
