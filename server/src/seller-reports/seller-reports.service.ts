import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { ConversationType, SellerReportStatus, SellerSanctionType } from '@/generated/prisma/enums'

import { NotificationsService } from '@/notifications/notifications.service'
import { PrismaService } from '@/prisma/prisma.service'
import { MS_PER_DAY } from '@/seller-reviews/constants/seller-reviews.constants'

import {
  SELLER_REPORTER_MIN_ACCOUNT_AGE_DAYS,
  SELLER_REPORTS_PER_DAY_LIMIT,
  SELLER_REPORTS_TO_SUSPEND_ADS
} from './constants/seller-reports.constants'
import { CreateSellerReportDto } from './dto/create-seller-report.dto'
import { SellerAdsSuspensionService } from './seller-ads-suspension.service'
import { lockUser } from './utils/user-lock.util'

// Жалобы на продавцов: мошенничество, обман. Сама жалоба рейтинг не меняет;
// когда набирается достаточно независимых жалоб, объявления продавца
// приостанавливаются до решения модератора (SellerReportsModerationService).
@Injectable()
export class SellerReportsService {
  private readonly logger = new Logger(SellerReportsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly adsSuspension: SellerAdsSuspensionService,
    private readonly notificationsService: NotificationsService
  ) {}

  async report(sellerId: string, reporterId: string, dto: CreateSellerReportDto): Promise<void> {
    if (sellerId === reporterId) {
      throw new ForbiddenException('Нельзя жаловаться на себя')
    }

    const seller = await this.prisma.user.findUnique({ where: { id: sellerId }, select: { deletedAt: true } })

    if (!seller || seller.deletedAt) {
      throw new NotFoundException('Продавец не найден')
    }

    await this.assertHadContact(reporterId, sellerId)
    await this.assertAdBelongsToSeller(dto.adId, sellerId)
    await this.assertWithinDailyLimit(reporterId)

    let suspended = 0

    try {
      suspended = await this.prisma.$transaction(async tx => {
        // Сначала блокировка продавца, потом запись и подсчёт: две жалобы,
        // пришедшие одновременно, видят друг друга, и приостановка срабатывает
        // ровно один раз.
        await lockUser(tx, sellerId)

        await tx.sellerReport.create({
          data: {
            sellerId,
            reporterId,
            adId: dto.adId ?? null,
            reason: dto.reason,
            comment: dto.comment?.trim() || null
          }
        })

        if ((await this.countIndependentPendingReports(tx, sellerId)) < SELLER_REPORTS_TO_SUSPEND_ADS) {
          return 0
        }

        const count = await this.adsSuspension.suspend(tx, sellerId)

        if (count > 0) {
          await tx.sellerSanction.create({ data: { sellerId, type: SellerSanctionType.ADS_SUSPENDED } })
        }

        return count
      })
    } catch (error) {
      // @@unique([sellerId, reporterId]): повторная жалоба того же человека.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Вы уже жаловались на этого продавца')
      }

      throw error
    }

    // Уведомление не должно откатывать жалобу, поэтому оно после транзакции.
    if (suspended > 0) {
      await this.notifySuspended(sellerId)
    }
  }

  // Пожаловаться на мошенничество может тот, кто с продавцом сталкивался:
  // писал ему по объявлению или открывал его телефон. Без этого жалобами можно
  // было бы закидать любого, не имея с ним дела.
  private async assertHadContact(reporterId: string, sellerId: string): Promise<void> {
    const [chats, reveals] = await Promise.all([
      this.prisma.conversation.count({ where: { type: ConversationType.AD, buyerId: reporterId, sellerId } }),
      this.prisma.adPhoneReveal.count({ where: { userId: reporterId, sellerId } })
    ])

    if (chats + reveals === 0) {
      throw new ForbiddenException('Пожаловаться можно только на продавца, с которым вы связывались')
    }
  }

  private async assertAdBelongsToSeller(adId: string | undefined, sellerId: string): Promise<void> {
    if (!adId) {
      return
    }

    const count = await this.prisma.ad.count({ where: { id: adId, userId: sellerId } })

    if (count === 0) {
      throw new BadRequestException('Объявление не принадлежит этому продавцу')
    }
  }

  private async assertWithinDailyLimit(reporterId: string): Promise<void> {
    const reportsToday = await this.prisma.sellerReport.count({
      where: { reporterId, createdAt: { gte: new Date(Date.now() - MS_PER_DAY) } }
    })

    if (reportsToday >= SELLER_REPORTS_PER_DAY_LIMIT) {
      throw new ForbiddenException('Слишком много жалоб за сутки, попробуйте завтра')
    }
  }

  // Нерассмотренные жалобы от аккаунтов не моложе порога: свежие аккаунты не
  // считаются, иначе приостановку можно было бы устроить пачкой одноразовых.
  private countIndependentPendingReports(tx: Prisma.TransactionClient, sellerId: string): Promise<number> {
    const oldestAllowedCreatedAt = new Date(Date.now() - SELLER_REPORTER_MIN_ACCOUNT_AGE_DAYS * MS_PER_DAY)

    return tx.sellerReport.count({
      where: {
        sellerId,
        status: SellerReportStatus.PENDING,
        reporter: { createdAt: { lte: oldestAllowedCreatedAt } }
      }
    })
  }

  private async notifySuspended(sellerId: string): Promise<void> {
    try {
      await this.notificationsService.notifySellerAdsSuspended(sellerId)
    } catch (error) {
      this.logger.error(`Не удалось уведомить продавца ${sellerId} о приостановке объявлений`, error)
    }
  }
}
