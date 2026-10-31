import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { FileService } from '@/file/file.service'
import { AdStatus } from '@/generated/prisma/client'
import { NotificationsService } from '@/notifications/notifications.service'
import { PrismaService } from '@/prisma/prisma.service'

import { AD_DRAFT_EXPIRY_WARNING_DAYS, AD_DRAFT_RETENTION_DAYS } from '../constants/ads.constants'

const DAY_MS = 24 * 60 * 60 * 1000

// Черновики, которые не менялись AD_DRAFT_RETENTION_DAYS дней, удаляются вместе
// с фото в S3: иначе брошенные черновики копились бы вечно (у каждого до 15
// фото). «Не менялся» — это Ad.updatedAt: любое сохранение формы продлевает срок
// заново, а переход в черновик из другого статуса (например, из отклонённых)
// начинает отсчёт с этого момента.
//
// За AD_DRAFT_EXPIRY_WARNING_DAYS дней до удаления владелец получает
// предупреждение (уведомление, push, письмо). Отдельного признака «уже
// предупреждён» нет: каждый черновик попадает в окно предупреждения ровно один
// запуск, потому что ширина окна равна периоду запуска (сутки), а сохранение
// черновика сдвигает его вместе с updatedAt. Если сервер в 3:30 был недоступен,
// предупреждение за этот день пропадёт — удаление при этом всё равно произойдёт
// по сроку; это осознанный выбор в пользу простоты (без колонки и миграции).
@Injectable()
export class AdsDraftCleanupWorker {
  private readonly logger = new Logger(AdsDraftCleanupWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
    private readonly notificationsService: NotificationsService
  ) {}

  // Через полчаса после чистки архива (3:00), чтобы не грузить S3 одновременно.
  @Cron('30 3 * * *')
  async cleanupDrafts() {
    const now = Date.now()

    // Сначала предупреждаем, потом удаляем: окна не пересекаются (27–28 суток и
    // 30+), порядок нужен лишь чтобы сбой одного шага не отменял другой.
    await this.warnAboutExpiringDrafts(now).catch(error =>
      this.logger.error('Не удалось предупредить о скором удалении черновиков', error)
    )
    await this.purgeExpiredDrafts(now).catch(error => this.logger.error('Не удалось удалить старые черновики', error))
  }

  private async warnAboutExpiringDrafts(now: number) {
    // updatedAt в окне (warnFrom, warnTo]: до удаления осталось WARNING_DAYS
    // суток, и в предыдущий запуск черновик под окно ещё не подходил.
    const warnTo = new Date(now - (AD_DRAFT_RETENTION_DAYS - AD_DRAFT_EXPIRY_WARNING_DAYS) * DAY_MS)
    const warnFrom = new Date(warnTo.getTime() - DAY_MS)

    const drafts = await this.prisma.ad.findMany({
      where: {
        status: AdStatus.DRAFT,
        updatedAt: { gt: warnFrom, lte: warnTo },
        user: { deletedAt: null }
      },
      select: { id: true, title: true, userId: true },
      orderBy: { updatedAt: 'asc' }
    })

    if (drafts.length === 0) return

    const draftsByUser = new Map<string, Array<{ id: string; title: string }>>()

    for (const { id, title, userId } of drafts) {
      draftsByUser.set(userId, [...(draftsByUser.get(userId) ?? []), { id, title }])
    }

    this.logger.log(
      `Предупреждаем о скором удалении черновиков: ${drafts.length} шт. у ${draftsByUser.size} владельцев`
    )

    for (const [userId, userDrafts] of draftsByUser) {
      try {
        await this.notificationsService.notifyDraftsExpiring(userId, userDrafts, AD_DRAFT_EXPIRY_WARNING_DAYS)
      } catch (error) {
        // Один владелец с ошибкой не лишает предупреждения остальных.
        this.logger.error(`Не удалось предупредить пользователя ${userId} о скором удалении черновиков`, error)
      }
    }
  }

  private async purgeExpiredDrafts(now: number) {
    const cutoff = new Date(now - AD_DRAFT_RETENTION_DAYS * DAY_MS)

    const drafts = await this.prisma.ad.findMany({
      where: { status: AdStatus.DRAFT, updatedAt: { lte: cutoff } },
      select: { id: true, images: true }
    })

    if (drafts.length === 0) return

    this.logger.log(`Найдено ${drafts.length} старых черновиков на удаление`)

    for (const draft of drafts) {
      try {
        if (draft.images.length > 0) {
          await Promise.all(draft.images.map(url => this.fileService.deleteFileByUrl(url)))
        }

        // Сначала фото, потом запись: если удаление из S3 упало, черновик
        // остаётся и будет подобран следующей ночью (как в архивной чистке).
        await this.prisma.ad.delete({ where: { id: draft.id } })
      } catch (error) {
        this.logger.error(`Не удалось удалить старый черновик ${draft.id}`, error)
      }
    }
  }
}
