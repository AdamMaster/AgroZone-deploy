import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { ConversationType, SellerReviewContactType, SellerReviewStatus } from '@/generated/prisma/enums'

import { PrismaService } from '@/prisma/prisma.service'

import { CreateSellerReviewDto } from './dto/create-seller-review.dto'
import { FindSellerReviewsQueryDto } from './dto/find-seller-reviews-query.dto'
import { ReplySellerReviewDto } from './dto/reply-seller-review.dto'
import { UpdateSellerReviewDto } from './dto/update-seller-review.dto'
import { SellerRatingService } from './seller-rating.service'
import { SellerReviewEligibilityService } from './seller-review-eligibility.service'
import { SellerReviewBlockReason, SellerReviewEligibility } from './seller-review-eligibility.types'
import { SELLER_REVIEWS_PAGE_SIZE_DEFAULT } from './constants/seller-reviews.constants'
import { buildPublicRating } from './utils/public-rating.util'
import { computeReviewWeight } from './utils/review-weight.util'

// Что отдаём клиенту. Вес, диалог и статус модерации сюда не попадают:
// вес — внутренняя механика рейтинга, остальное клиенту не нужно.
const REVIEW_SELECT = {
  id: true,
  rating: true,
  text: true,
  contactType: true,
  sellerReply: true,
  sellerReplyAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, displayName: true, picture: true, deletedAt: true } }
} satisfies Prisma.SellerReviewSelect

type ReviewRow = Prisma.SellerReviewGetPayload<{ select: typeof REVIEW_SELECT }>

// Пустую строку считаем «без текста»: в базе либо текст, либо null.
const normalizeText = (text: string | undefined) => (text === undefined ? undefined : text.trim() || null)

@Injectable()
export class SellerReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: SellerReviewEligibilityService,
    private readonly ratingService: SellerRatingService
  ) {}

  // Публичный список отзывов продавца вместе с итоговым рейтингом
  // (average — null, пока отзывов меньше порога).
  async findForSeller(sellerId: string, query: FindSellerReviewsQueryDto) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { ratingAverage: true, ratingCount: true, deletedAt: true }
    })

    if (!seller || seller.deletedAt) {
      throw new NotFoundException('Продавец не найден')
    }

    const limit = query.limit ?? SELLER_REVIEWS_PAGE_SIZE_DEFAULT
    const rows = await this.prisma.sellerReview.findMany({
      where: { sellerId, status: SellerReviewStatus.PUBLISHED },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      // Лишняя строка нужна только чтобы узнать, есть ли следующая страница.
      take: limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      select: REVIEW_SELECT
    })

    const hasMore = rows.length > limit
    const items = (hasMore ? rows.slice(0, limit) : rows).map(row => this.present(row))

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      rating: buildPublicRating(seller)
    }
  }

  // Что показать текущему пользователю на странице продавца: его отзыв (если
  // уже есть) и можно ли оставить новый — с причиной, если нельзя.
  async findMine(authorId: string, sellerId: string) {
    const [review, eligibility] = await Promise.all([
      this.prisma.sellerReview.findUnique({
        where: { authorId_sellerId: { authorId, sellerId } },
        select: REVIEW_SELECT
      }),
      this.eligibilityService.check(authorId, sellerId)
    ])

    return { review: review ? this.present(review) : null, eligibility }
  }

  async create(authorId: string, sellerId: string, dto: CreateSellerReviewDto) {
    const now = new Date()
    const eligibility = await this.eligibilityService.check(authorId, sellerId, now)

    if (!eligibility.canReview) {
      throw this.toException(eligibility)
    }

    const weight = computeReviewWeight(eligibility.contactType, await this.loadAuthorTrust(authorId, sellerId, now))

    try {
      const review = await this.prisma.$transaction(async tx => {
        if (eligibility.contactType === SellerReviewContactType.DEAL_CONFIRMED) {
          await this.lockConfirmedDeal(tx, eligibility.conversationId)
        }

        const created = await tx.sellerReview.create({
          data: {
            sellerId,
            authorId,
            conversationId: eligibility.conversationId,
            contactType: eligibility.contactType,
            rating: dto.rating,
            text: normalizeText(dto.text) ?? null,
            weight
          },
          select: REVIEW_SELECT
        })

        await this.ratingService.recalculate(tx, [sellerId, authorId])

        return created
      })

      return this.present(review)
    } catch (error) {
      // @@unique([authorId, sellerId]): два одновременных запроса прошли
      // проверку допуска — второй упирается в уникальность.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Вы уже оставили отзыв этому продавцу')
      }

      throw error
    }
  }

  // Автор правит свой отзыв: оценку и/или текст. Тип контакта и вес не
  // пересматриваются — право на отзыв получено один раз.
  async update(reviewId: string, userId: string, dto: UpdateSellerReviewDto) {
    const review = await this.findOwnPublished(reviewId, userId, 'authorId')

    const text = normalizeText(dto.text)

    if (dto.rating === undefined && text === undefined) {
      throw new BadRequestException('Нечего изменять: укажите оценку или текст')
    }

    const updated = await this.prisma.$transaction(async tx => {
      const row = await tx.sellerReview.update({
        where: { id: reviewId },
        data: { ...(dto.rating !== undefined && { rating: dto.rating }), ...(text !== undefined && { text }) },
        select: REVIEW_SELECT
      })

      await this.ratingService.recalculate(tx, [review.sellerId, review.authorId])

      return row
    })

    return this.present(updated)
  }

  // Автор удаляет свой отзыв. Удалить можно и скрытый модератором: автор
  // вправе убрать свой текст, а рейтинг от этого не меняется (скрытые в нём
  // не участвуют).
  async remove(reviewId: string, userId: string): Promise<void> {
    const review = await this.prisma.sellerReview.findUnique({
      where: { id: reviewId },
      select: { authorId: true, sellerId: true }
    })

    if (!review || review.authorId !== userId) {
      throw new NotFoundException('Отзыв не найден')
    }

    await this.prisma.$transaction(async tx => {
      await tx.sellerReview.delete({ where: { id: reviewId } })
      await this.ratingService.recalculate(tx, [review.sellerId, review.authorId])
    })
  }

  // Продавец отвечает на отзыв о себе. Ответ один: повторный запрос
  // заменяет прежний (так ответ редактируется).
  async reply(reviewId: string, userId: string, dto: ReplySellerReviewDto) {
    await this.findOwnPublished(reviewId, userId, 'sellerId')

    const sellerReply = normalizeText(dto.text)

    if (!sellerReply) {
      throw new BadRequestException('Ответ не может быть пустым')
    }

    const updated = await this.prisma.sellerReview.update({
      where: { id: reviewId },
      data: { sellerReply, sellerReplyAt: new Date() },
      select: REVIEW_SELECT
    })

    return this.present(updated)
  }

  // Отзыв, которым распоряжается именно этот пользователь (как автор или как
  // продавец) и который ещё опубликован. Чужой отзыв выглядит как
  // несуществующий, чтобы по ответам нельзя было перебирать чужие id.
  private async findOwnPublished(reviewId: string, userId: string, ownerField: 'authorId' | 'sellerId') {
    const review = await this.prisma.sellerReview.findUnique({
      where: { id: reviewId },
      select: { authorId: true, sellerId: true, status: true }
    })

    if (!review || review[ownerField] !== userId) {
      throw new NotFoundException('Отзыв не найден')
    }

    if (review.status !== SellerReviewStatus.PUBLISHED) {
      throw new ForbiddenException('Этот отзыв сейчас нельзя изменить')
    }

    return review
  }

  // Данные для коэффициента доверия к автору: возраст аккаунта и есть ли у
  // него другая активность (свои объявления или диалоги не с этим продавцом).
  private async loadAuthorTrust(authorId: string, sellerId: string, now: Date) {
    const [author, ads, conversations] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: authorId }, select: { createdAt: true } }),
      this.prisma.ad.count({ where: { userId: authorId } }),
      this.prisma.conversation.count({
        where: {
          type: ConversationType.AD,
          OR: [
            { buyerId: authorId, sellerId: { not: sellerId } },
            { sellerId: authorId, buyerId: { not: sellerId } }
          ]
        }
      })
    ])

    return { accountCreatedAt: author.createdAt, hasOtherActivity: ads + conversations > 0, now }
  }

  // Берёт блокировку FOR SHARE на строку диалога и убеждается, что сделка всё
  // ещё подтверждена. Блокировка не даёт продавцу отменить сделку, пока
  // отзыв не сохранён; а если он успел отменить раньше, отзыв не создаётся.
  // Зеркальная часть — ConversationsService.writeDealState.
  private async lockConfirmedDeal(tx: Prisma.TransactionClient, conversationId: string | null) {
    const rows = conversationId
      ? await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "conversations"
          WHERE "id" = ${conversationId} AND "deal_confirmed_at" IS NOT NULL
          FOR SHARE`
      : []

    if (rows.length === 0) {
      throw new ConflictException('Продавец снял отметку о сделке, попробуйте ещё раз')
    }
  }

  private toException(eligibility: Extract<SellerReviewEligibility, { canReview: false }>) {
    switch (eligibility.reason) {
      case SellerReviewBlockReason.SellerUnavailable:
        return new NotFoundException(eligibility.message)
      case SellerReviewBlockReason.AlreadyReviewed:
        return new ConflictException(eligibility.message)
      default:
        return new ForbiddenException(eligibility.message)
    }
  }

  // У удалённого автора не показываем имя и фото: аккаунт обезличен.
  private present({ author, ...review }: ReviewRow) {
    return {
      ...review,
      author: author.deletedAt
        ? { id: author.id, displayName: null, picture: null, deletedAt: author.deletedAt }
        : author
    }
  }
}
