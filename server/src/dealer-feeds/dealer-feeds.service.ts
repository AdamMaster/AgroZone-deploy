import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'
import { DealerFeedStatus } from '@/generated/prisma/client'

import { DealerFeedParserService } from './parser/dealer-feed-parser.service'
import { DealerFeedParseResult } from './parser/dealer-feed-parser.types'
import { DealerFeedSyncService } from './sync/dealer-feed-sync.service'

// Сколько ошибок по конкретным позициям возвращать в предпросмотре — сам
// фид может быть невалиден на сотнях позиций разом (например, одно и то
// же не заведённое поле у всех), нет смысла отдавать список из тысячи
// одинаковых по сути ошибок ни дилеру, ни админу.
const PREVIEW_ERROR_SAMPLE_SIZE = 50

@Injectable()
export class DealerFeedsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: DealerFeedParserService,
    private readonly syncService: DealerFeedSyncService
  ) {}

  // Подключение/переподключение фида дилером. Один аккаунт — один фид
  // (см. схему), поэтому это upsert: повторная отправка меняет ссылку у
  // уже существующей записи. Смена ссылки — это фактически новый,
  // непроверенный источник данных, поэтому ВСЕГДА сбрасывает статус
  // обратно на "на проверке", даже если старый фид уже был одобрен — см.
  // обсуждение про то, что массовый импорт требует ручного одобрения
  // именно КОНКРЕТНОЙ ссылки, а не абстрактного "доверия аккаунту".
  async submit(userId: string, url: string) {
    return this.prisma.dealerFeed.upsert({
      where: { userId },
      create: { userId, url, status: DealerFeedStatus.PENDING_REVIEW },
      update: {
        url,
        status: DealerFeedStatus.PENDING_REVIEW,
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null
      }
    })
  }

  async getMine(userId: string) {
    return this.prisma.dealerFeed.findUnique({ where: { userId } })
  }

  private async getMineOrThrow(userId: string) {
    const feed = await this.prisma.dealerFeed.findUnique({ where: { userId } })

    if (!feed) {
      throw new NotFoundException('Фид не подключён')
    }

    return feed
  }

  async setPaused(userId: string, isPaused: boolean) {
    await this.getMineOrThrow(userId)

    return this.prisma.dealerFeed.update({
      where: { userId },
      data: { isPaused }
    })
  }

  // Ручной запуск синхронизации ("Обновить сейчас") — та же логика, что и
  // у фонового воркера (см. DealerFeedSyncWorker), включая все проверки
  // внутри syncOne (одобрен ли фид, не на паузе ли, есть ли действующий
  // тариф) — если что-то из этого не так, метод просто ничего не сделает
  // молча (см. DealerFeedSyncService.syncOne), а дилер увидит это по
  // lastSync* полям в GET /dealer-feeds/me после вызова.
  async syncMine(userId: string) {
    const feed = await this.getMineOrThrow(userId)
    await this.syncService.syncOne(feed)
    return this.getMine(userId)
  }

  // Прогоняет фид дилера через парсер/валидатор БЕЗ сохранения чего-либо
  // в базу — ни новых объявлений, ни изменений в самой записи DealerFeed
  // (в частности, НЕ трогает lastSync* — те поля отражают только реальные
  // синхронизации, см. DealerFeedSyncService). Доступен и самому дилеру
  // (самопроверка перед/после подключения), и админу (см. controller) —
  // на одних и тех же данных фида, поэтому единая реализация.
  async previewByUrl(url: string) {
    const result = await this.parser.fetchAndParse(url)
    return this.summarize(result)
  }

  async previewMine(userId: string) {
    const feed = await this.getMineOrThrow(userId)
    return this.previewByUrl(feed.url)
  }

  async previewById(id: string) {
    const feed = await this.getByIdOrThrow(id)
    return this.previewByUrl(feed.url)
  }

  private summarize(result: DealerFeedParseResult) {
    return {
      globalError: result.globalError,
      totalValid: result.valid.length,
      totalErrors: result.errors.length,
      // Полные валидные позиции в предпросмотр не отдаём намеренно —
      // это может быть тысяча объектов с описаниями на предпросмотр,
      // который нужен только чтобы оценить общую картину. Небольшая
      // выборка названий — достаточно, чтобы понять, что за товары.
      sampleTitles: result.valid.slice(0, 10).map(o => o.title),
      errors: result.errors.slice(0, PREVIEW_ERROR_SAMPLE_SIZE)
    }
  }

  private async getByIdOrThrow(id: string) {
    const feed = await this.prisma.dealerFeed.findUnique({ where: { id } })

    if (!feed) {
      throw new NotFoundException('Фид не найден')
    }

    return feed
  }

  // --- Админ ---

  async findPending(page = 1, limit = 20) {
    const take = Math.min(limit, 50)
    const skip = (page - 1) * take

    const [items, total] = await Promise.all([
      this.prisma.dealerFeed.findMany({
        where: { status: DealerFeedStatus.PENDING_REVIEW },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: { user: { select: { id: true, displayName: true, email: true, businessName: true } } }
      }),
      this.prisma.dealerFeed.count({ where: { status: DealerFeedStatus.PENDING_REVIEW } })
    ])

    return { items, total, page, limit: take }
  }

  async findAllForAdmin(page = 1, limit = 20) {
    const take = Math.min(limit, 50)
    const skip = (page - 1) * take

    const [items, total] = await Promise.all([
      this.prisma.dealerFeed.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { id: true, displayName: true, email: true, businessName: true } } }
      }),
      this.prisma.dealerFeed.count()
    ])

    return { items, total, page, limit: take }
  }

  async approve(id: string, adminUserId: string) {
    const feed = await this.getByIdOrThrow(id)

    if (feed.status !== DealerFeedStatus.PENDING_REVIEW) {
      throw new ConflictException('Фид уже был рассмотрен')
    }

    return this.prisma.dealerFeed.update({
      where: { id },
      data: {
        status: DealerFeedStatus.APPROVED,
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedBy: adminUserId
      }
    })
  }

  async reject(id: string, adminUserId: string, reason: string) {
    const feed = await this.getByIdOrThrow(id)

    if (feed.status !== DealerFeedStatus.PENDING_REVIEW) {
      throw new ConflictException('Фид уже был рассмотрен')
    }

    return this.prisma.dealerFeed.update({
      where: { id },
      data: {
        status: DealerFeedStatus.REJECTED,
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminUserId
      }
    })
  }
}
