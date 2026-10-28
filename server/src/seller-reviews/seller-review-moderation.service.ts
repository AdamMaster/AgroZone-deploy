import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { SellerReviewReportStatus, SellerReviewStatus } from '@/generated/prisma/enums'

import { NotificationsService } from '@/notifications/notifications.service'
import { PrismaService } from '@/prisma/prisma.service'

import { FindReviewModerationQueueQueryDto } from './dto/find-review-moderation-queue-query.dto'
import { ModerateSellerReviewDto, SellerReviewModerationDecision } from './dto/moderate-seller-review.dto'
import { SELLER_REVIEW_MODERATION_PAGE_SIZE_DEFAULT } from './constants/seller-reviews.constants'
import { SellerRatingService } from './seller-rating.service'
import { lockReview } from './utils/review-lock.util'

const userBrief = { select: { id: true, displayName: true, email: true, deletedAt: true } } as const

// В очередь попадают отзывы, ждущие решения (PENDING), и опубликованные, на
// которые есть нерассмотренные жалобы.
const QUEUE_WHERE = {
  OR: [{ status: SellerReviewStatus.PENDING }, { reports: { some: { status: SellerReviewReportStatus.PENDING } } }]
} satisfies Prisma.SellerReviewWhereInput

const QUEUE_SELECT = {
  id: true,
  rating: true,
  text: true,
  status: true,
  contactType: true,
  weight: true,
  filterFlags: true,
  createdAt: true,
  author: userBrief,
  seller: userBrief,
  reports: {
    where: { status: SellerReviewReportStatus.PENDING },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reason: true,
      comment: true,
      createdAt: true,
      reporter: { select: { id: true, displayName: true } }
    }
  }
} satisfies Prisma.SellerReviewSelect

@Injectable()
export class SellerReviewModerationService {
  private readonly logger = new Logger(SellerReviewModerationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingService: SellerRatingService,
    private readonly notificationsService: NotificationsService
  ) {}

  // Очередь модератора: старые отзывы первыми, чтобы ничто не залёживалось.
  async findQueue(query: FindReviewModerationQueueQueryDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? SELLER_REVIEW_MODERATION_PAGE_SIZE_DEFAULT

    const [items, total] = await Promise.all([
      this.prisma.sellerReview.findMany({
        where: QUEUE_WHERE,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: QUEUE_SELECT
      }),
      this.prisma.sellerReview.count({ where: QUEUE_WHERE })
    ])

    return { items, total, page, limit }
  }

  // Решение модератора. PUBLISH — отзыв остаётся (или возвращается) в
  // рейтинге, жалобы признаются необоснованными; HIDE — отзыв скрыт, жалобы
  // признаны обоснованными. Все нерассмотренные жалобы закрываются тем же
  // решением.
  async moderate(reviewId: string, moderatorId: string, dto: ModerateSellerReviewDto) {
    const publish = dto.decision === SellerReviewModerationDecision.PUBLISH
    const nextStatus = publish ? SellerReviewStatus.PUBLISHED : SellerReviewStatus.HIDDEN

    const { previousStatus, review } = await this.prisma.$transaction(async tx => {
      const locked = await lockReview(tx, reviewId)

      if (!locked) {
        throw new NotFoundException('Отзыв не найден')
      }

      const updated = await tx.sellerReview.update({
        where: { id: reviewId },
        data: { status: nextStatus, moderatedAt: new Date(), moderatedById: moderatorId },
        select: { id: true, status: true, sellerId: true, authorId: true, moderatedAt: true }
      })

      await tx.sellerReviewReport.updateMany({
        where: { reviewId, status: SellerReviewReportStatus.PENDING },
        data: { status: publish ? SellerReviewReportStatus.DISMISSED : SellerReviewReportStatus.ACCEPTED }
      })

      await this.ratingService.recalculate(tx, [updated.sellerId, updated.authorId])

      return { previousStatus: locked.status, review: updated }
    })

    await this.notify(review, previousStatus)

    return { id: review.id, status: review.status, moderatedAt: review.moderatedAt }
  }

  // Уведомления о решении. Автору сообщаем только о том, что изменило видимость его отзыва:
  // подтверждение уже опубликованного отзыва (модератор отклонил жалобы)
  // ничего для него не меняет. Уведомление не должно откатывать решение,
  // поэтому оно вне транзакции и его сбой лишь логируется.
  private async notify(
    review: { id: string; status: SellerReviewStatus; sellerId: string; authorId: string },
    previousStatus: SellerReviewStatus
  ) {
    if (review.status === previousStatus) {
      return
    }

    try {
      if (review.status === SellerReviewStatus.HIDDEN) {
        await this.notificationsService.notifySellerReviewHidden(review.authorId, review.sellerId)
      } else {
        await this.notificationsService.notifySellerReviewPublished(review.authorId, review.sellerId)
      }
    } catch (error) {
      this.logger.error(`Не удалось уведомить автора отзыва ${review.id} о решении модератора`, error)
    }

    // Продавец узнаёт об отзыве, когда тот стал виден: до решения модератора
    // отзыв на проверке ему не показывается. Отдельный try: сбой одного
    // уведомления не отменяет другое.
    if (review.status !== SellerReviewStatus.PUBLISHED) {
      return
    }

    try {
      await this.notificationsService.notifySellerReviewReceived(review.sellerId)
    } catch (error) {
      this.logger.error(`Не удалось уведомить продавца об отзыве ${review.id}`, error)
    }
  }
}
