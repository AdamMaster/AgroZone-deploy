import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { SellerReviewReportStatus, SellerReviewStatus } from '@/generated/prisma/enums'

import { PrismaService } from '@/prisma/prisma.service'

import {
  MS_PER_DAY,
  SELLER_REVIEW_REPORTER_MIN_ACCOUNT_AGE_DAYS,
  SELLER_REVIEW_REPORTS_PER_DAY_LIMIT,
  SELLER_REVIEW_REPORTS_TO_HIDE
} from './constants/seller-reviews.constants'
import { ReportSellerReviewDto } from './dto/report-seller-review.dto'
import { SellerRatingService } from './seller-rating.service'
import { lockReview } from './utils/review-lock.util'

// Жалобы пользователей на отзывы. Сама жалоба только кладёт отзыв в очередь
// модератора; автоматически скрывается отзыв лишь когда на него пожаловались
// сразу несколько независимых пользователей, — до решения модератора.
@Injectable()
export class SellerReviewReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingService: SellerRatingService
  ) {}

  async report(reviewId: string, reporterId: string, dto: ReportSellerReviewDto): Promise<void> {
    await this.assertWithinDailyLimit(reporterId)

    try {
      await this.prisma.$transaction(async tx => {
        const review = await lockReview(tx, reviewId)

        // Пожаловаться можно на то, что видно другим, — то есть на
        // опубликованный отзыв.
        if (!review || review.status !== SellerReviewStatus.PUBLISHED) {
          throw new NotFoundException('Отзыв не найден')
        }

        if (review.authorId === reporterId) {
          throw new ForbiddenException('Нельзя жаловаться на собственный отзыв')
        }

        await tx.sellerReviewReport.create({
          data: { reviewId, reporterId, reason: dto.reason, comment: dto.comment?.trim() || null }
        })

        if ((await this.countIndependentPendingReports(tx, reviewId)) >= SELLER_REVIEW_REPORTS_TO_HIDE) {
          await tx.sellerReview.update({ where: { id: reviewId }, data: { status: SellerReviewStatus.PENDING } })
          await this.ratingService.recalculate(tx, [review.sellerId, review.authorId])
        }
      })
    } catch (error) {
      // @@unique([reviewId, reporterId]): повторная жалоба от того же человека.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Вы уже жаловались на этот отзыв')
      }

      throw error
    }
  }

  private async assertWithinDailyLimit(reporterId: string): Promise<void> {
    const reportsToday = await this.prisma.sellerReviewReport.count({
      where: { reporterId, createdAt: { gte: new Date(Date.now() - MS_PER_DAY) } }
    })

    if (reportsToday >= SELLER_REVIEW_REPORTS_PER_DAY_LIMIT) {
      throw new ForbiddenException('Слишком много жалоб за сутки, попробуйте завтра')
    }
  }

  // Нерассмотренные жалобы от аккаунтов не моложе порога: свежие аккаунты
  // не считаются, иначе отзыв скрывался бы пачкой одноразовых.
  private countIndependentPendingReports(tx: Prisma.TransactionClient, reviewId: string): Promise<number> {
    const oldestAllowedCreatedAt = new Date(Date.now() - SELLER_REVIEW_REPORTER_MIN_ACCOUNT_AGE_DAYS * MS_PER_DAY)

    return tx.sellerReviewReport.count({
      where: {
        reviewId,
        status: SellerReviewReportStatus.PENDING,
        reporter: { createdAt: { lte: oldestAllowedCreatedAt } }
      }
    })
  }
}
