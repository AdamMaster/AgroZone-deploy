import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import {
  AdStatus,
  SellerReportStatus,
  SellerReviewReportStatus,
  SellerReviewStatus,
  SellerSanctionType
} from '@/generated/prisma/enums'

import { NotificationsService } from '@/notifications/notifications.service'
import { PrismaService } from '@/prisma/prisma.service'
import { SellerRatingService } from '@/seller-reviews/seller-rating.service'
import { SellerReviewSignalsService } from '@/seller-reviews/seller-review-signals.service'

import {
  SELLER_REPORTS_QUEUE_PAGE_SIZE_DEFAULT,
  SELLER_SANCTIONS_HISTORY_LIMIT
} from './constants/seller-reports.constants'
import { FindSellerReportsQueueQueryDto } from './dto/find-seller-reports-queue-query.dto'
import { ResolveSellerReportsDto, SellerReportResolutionAction } from './dto/resolve-seller-reports.dto'
import { RollbackSellerReviewsDto } from './dto/rollback-seller-reviews.dto'
import { SellerAdsSuspensionService } from './seller-ads-suspension.service'
import { lockUser } from './utils/user-lock.util'

// Что в итоге случилось с объявлениями, чтобы уведомить продавца уже после
// коммита.
interface ResolutionOutcome {
  warned: boolean
  suspended: boolean
  restored: boolean
}

@Injectable()
export class SellerReportsModerationService {
  private readonly logger = new Logger(SellerReportsModerationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly adsSuspension: SellerAdsSuspensionService,
    private readonly ratingService: SellerRatingService,
    private readonly signalsService: SellerReviewSignalsService,
    private readonly notificationsService: NotificationsService
  ) {}

  // Очередь: продавцы с нерассмотренными жалобами, у кого жалоба висит
  // дольше — первыми. Жалобы одного продавца разбираются вместе, поэтому
  // строка очереди — продавец, а не отдельная жалоба.
  async findQueue(query: FindSellerReportsQueueQueryDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? SELLER_REPORTS_QUEUE_PAGE_SIZE_DEFAULT
    const where = { status: SellerReportStatus.PENDING }

    const [groups, allGroups] = await Promise.all([
      this.prisma.sellerReport.groupBy({
        by: ['sellerId'],
        where,
        _count: { _all: true },
        _min: { createdAt: true },
        orderBy: [{ _min: { createdAt: 'asc' } }, { sellerId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.sellerReport.groupBy({ by: ['sellerId'], where })
    ])

    const sellerIds = groups.map(group => group.sellerId)
    const [sellers, suspended] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: sellerIds } },
        select: { id: true, displayName: true, email: true, createdAt: true, deletedAt: true }
      }),
      this.prisma.ad.groupBy({
        by: ['userId'],
        where: { userId: { in: sellerIds }, status: AdStatus.SUSPENDED },
        _count: { _all: true }
      })
    ])

    const sellerById = new Map(sellers.map(seller => [seller.id, seller]))
    const suspendedByUser = new Map(suspended.map(row => [row.userId, row._count._all]))

    return {
      items: groups.map(group => ({
        seller: sellerById.get(group.sellerId) ?? null,
        pendingReports: group._count._all,
        oldestReportAt: group._min.createdAt,
        suspendedAds: suspendedByUser.get(group.sellerId) ?? 0
      })),
      total: allGroups.length,
      page,
      limit
    }
  }

  // Карточка продавца для решения: кто он, сколько у него объявлений, что на
  // него написали, какие меры уже были и нет ли признаков накрутки отзывов.
  async getSellerCard(sellerId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        displayName: true,
        email: true,
        picture: true,
        type: true,
        createdAt: true,
        deletedAt: true,
        businessVerifiedAt: true,
        ratingAverage: true,
        ratingCount: true,
        phones: { select: { phone: true, isPrimary: true } }
      }
    })

    if (!seller) {
      throw new NotFoundException('Продавец не найден')
    }

    const [adGroups, reports, sanctions, reviewSignals] = await Promise.all([
      this.prisma.ad.groupBy({ by: ['status'], where: { userId: sellerId }, _count: { _all: true } }),
      this.prisma.sellerReport.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reason: true,
          comment: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          reporter: { select: { id: true, displayName: true, createdAt: true } },
          ad: { select: { id: true, title: true } }
        }
      }),
      this.prisma.sellerSanction.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        take: SELLER_SANCTIONS_HISTORY_LIMIT,
        select: {
          id: true,
          type: true,
          note: true,
          createdAt: true,
          moderator: { select: { id: true, displayName: true } }
        }
      }),
      this.signalsService.getSignals(sellerId)
    ])

    return {
      seller,
      ads: Object.fromEntries(adGroups.map(group => [group.status, group._count._all])),
      reports,
      sanctions,
      reviewSignals
    }
  }

  // Решение по жалобам на продавца. Все нерассмотренные жалобы закрываются
  // одним решением: модератор оценивает продавца целиком, а не жалобу за
  // жалобой.
  async resolve(sellerId: string, moderatorId: string, dto: ResolveSellerReportsDto) {
    const note = dto.note?.trim() || null

    const outcome = await this.prisma.$transaction(async tx => {
      await lockUser(tx, sellerId)

      const pending = await tx.sellerReport.count({ where: { sellerId, status: SellerReportStatus.PENDING } })

      if (pending === 0) {
        throw new ConflictException('Нерассмотренных жалоб на этого продавца нет')
      }

      const accepted = dto.action !== SellerReportResolutionAction.DISMISS

      await tx.sellerReport.updateMany({
        where: { sellerId, status: SellerReportStatus.PENDING },
        data: {
          status: accepted ? SellerReportStatus.ACCEPTED : SellerReportStatus.DISMISSED,
          resolvedAt: new Date()
        }
      })

      return this.applyAction(tx, sellerId, moderatorId, dto.action, note)
    })

    await this.notifySeller(sellerId, outcome)

    return { sellerId, action: dto.action }
  }

  // Откат отзывов продавца, когда накрутка подтверждена: все отзывы о нём
  // скрываются разом, рейтинг пересчитывается.
  async rollbackReviews(sellerId: string, moderatorId: string, dto: RollbackSellerReviewsDto) {
    const seller = await this.prisma.user.findUnique({ where: { id: sellerId }, select: { id: true } })

    if (!seller) {
      throw new NotFoundException('Продавец не найден')
    }

    const hidden = await this.prisma.$transaction(async tx => {
      await lockUser(tx, sellerId)

      const reviews = await tx.sellerReview.findMany({
        where: { sellerId, status: { not: SellerReviewStatus.HIDDEN } },
        select: { id: true, authorId: true }
      })

      if (reviews.length === 0) {
        return 0
      }

      const reviewIds = reviews.map(review => review.id)

      await tx.sellerReview.updateMany({
        where: { id: { in: reviewIds } },
        data: { status: SellerReviewStatus.HIDDEN, moderatedAt: new Date(), moderatedById: moderatorId }
      })

      // Жалобы на скрытые отзывы больше ничего не решают.
      await tx.sellerReviewReport.updateMany({
        where: { reviewId: { in: reviewIds }, status: SellerReviewReportStatus.PENDING },
        data: { status: SellerReviewReportStatus.ACCEPTED }
      })

      // Рейтинг меняется и у авторов: взаимность отзывов учитывается в весе.
      await this.ratingService.recalculate(tx, [sellerId, ...reviews.map(review => review.authorId)])

      await tx.sellerSanction.create({
        data: {
          sellerId,
          moderatorId,
          type: SellerSanctionType.REVIEWS_HIDDEN,
          note: dto.note?.trim() || null
        }
      })

      return reviews.length
    })

    return { sellerId, hidden }
  }

  private async applyAction(
    tx: Prisma.TransactionClient,
    sellerId: string,
    moderatorId: string,
    action: SellerReportResolutionAction,
    note: string | null
  ): Promise<ResolutionOutcome> {
    const outcome: ResolutionOutcome = { warned: false, suspended: false, restored: false }
    const sanction = (type: SellerSanctionType, sanctionNote: string | null = null) =>
      tx.sellerSanction.create({ data: { sellerId, moderatorId, type, note: sanctionNote } })

    if (action === SellerReportResolutionAction.SUSPEND_ADS) {
      outcome.suspended = (await this.adsSuspension.suspend(tx, sellerId)) > 0

      if (outcome.suspended) {
        await sanction(SellerSanctionType.ADS_SUSPENDED, note)
      }

      return outcome
    }

    // DISMISS и WARN возвращают приостановленные объявления: предупреждение
    // мягче приостановки.
    outcome.restored = (await this.adsSuspension.restore(tx, sellerId)) > 0

    if (outcome.restored) {
      await sanction(SellerSanctionType.ADS_RESTORED)
    }

    if (action === SellerReportResolutionAction.WARN) {
      outcome.warned = true
      await sanction(SellerSanctionType.WARNING, note)
    }

    return outcome
  }

  // Уведомления не должны откатывать решение, поэтому они после транзакции.
  private async notifySeller(sellerId: string, outcome: ResolutionOutcome): Promise<void> {
    try {
      if (outcome.warned) {
        await this.notificationsService.notifySellerWarning(sellerId)
      }

      if (outcome.suspended) {
        await this.notificationsService.notifySellerAdsSuspended(sellerId)
      }

      if (outcome.restored) {
        await this.notificationsService.notifySellerAdsRestored(sellerId)
      }
    } catch (error) {
      this.logger.error(`Не удалось уведомить продавца ${sellerId} о решении модератора`, error)
    }
  }
}
