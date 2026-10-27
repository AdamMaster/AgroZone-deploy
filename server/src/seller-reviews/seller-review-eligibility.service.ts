import { Injectable } from '@nestjs/common'
import { ConversationType, SellerReviewContactType } from '@/generated/prisma/enums'

import { BlockedUsersService } from '@/blocked-users/blocked-users.service'
import { PrismaService } from '@/prisma/prisma.service'

import {
  MS_PER_DAY,
  SELLER_REVIEWS_LIMIT_WINDOW_MS,
  SELLER_REVIEWS_PER_DAY_LIMIT,
  SELLER_REVIEW_MIN_ACCOUNT_AGE_DAYS
} from './constants/seller-reviews.constants'
import { SellerReviewBlockReason, SellerReviewEligibility } from './seller-review-eligibility.types'
import { ChatStats, evaluateContact } from './utils/contact.util'

const blocked = (reason: SellerReviewBlockReason, message: string, availableAt?: Date): SellerReviewEligibility => ({
  canReview: false,
  reason,
  message,
  ...(availableAt && { availableAt })
})

// Может ли пользователь оставить отзыв этому продавцу: единственное место,
// где живут правила допуска. И создание отзыва, и ответ клиенту «можно ли
// показать форму» идут через него, чтобы интерфейс и сервер не расходились.
@Injectable()
export class SellerReviewEligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockedUsersService: BlockedUsersService
  ) {}

  async check(authorId: string, sellerId: string, now = new Date()): Promise<SellerReviewEligibility> {
    if (authorId === sellerId) {
      return blocked(SellerReviewBlockReason.Self, 'Нельзя оставить отзыв самому себе')
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [authorId, sellerId] } },
      select: { id: true, createdAt: true, deletedAt: true }
    })
    const seller = users.find(user => user.id === sellerId)
    const author = users.find(user => user.id === authorId)

    if (!seller || seller.deletedAt || !author) {
      return blocked(SellerReviewBlockReason.SellerUnavailable, 'Продавец не найден')
    }

    const accountReadyAt = new Date(author.createdAt.getTime() + SELLER_REVIEW_MIN_ACCOUNT_AGE_DAYS * MS_PER_DAY)

    if (accountReadyAt > now) {
      return blocked(
        SellerReviewBlockReason.AccountTooYoung,
        'Оставлять отзывы можно через неделю после регистрации',
        accountReadyAt
      )
    }

    const existing = await this.prisma.sellerReview.findUnique({
      where: { authorId_sellerId: { authorId, sellerId } },
      select: { id: true }
    })

    if (existing) {
      return blocked(SellerReviewBlockReason.AlreadyReviewed, 'Вы уже оставили отзыв этому продавцу')
    }

    // Текст нейтральный, как у блокировки в чате: не сообщаем прямо, что
    // именно произошла блокировка.
    if (await this.blockedUsersService.isBlocked(authorId, sellerId)) {
      return blocked(SellerReviewBlockReason.Blocked, 'Оставить отзыв этому продавцу нельзя')
    }

    const contact = await this.resolveContact(authorId, sellerId, now)

    if (contact.status === 'none') {
      return blocked(
        SellerReviewBlockReason.NoContact,
        'Отзыв можно оставить после общения с продавцом: переписки в чате или звонка'
      )
    }

    if (contact.status === 'fresh') {
      return blocked(
        SellerReviewBlockReason.ContactTooFresh,
        'Отзыв можно оставить через 48 часов после начала общения',
        contact.availableAt
      )
    }

    const reviewsToday = await this.prisma.sellerReview.count({
      where: { authorId, createdAt: { gte: new Date(now.getTime() - SELLER_REVIEWS_LIMIT_WINDOW_MS) } }
    })

    if (reviewsToday >= SELLER_REVIEWS_PER_DAY_LIMIT) {
      return blocked(
        SellerReviewBlockReason.DailyLimit,
        'Вы оставили слишком много отзывов за сутки, попробуйте завтра'
      )
    }

    return { canReview: true, contactType: contact.contactType, conversationId: contact.conversationId }
  }

  // Сначала подтверждённая сделка: она сильнее любого контакта и даёт полный
  // вес. Иначе — переписка или показанный телефон с выдержкой.
  private async resolveContact(authorId: string, sellerId: string, now: Date) {
    const conversations = await this.prisma.conversation.findMany({
      where: { type: ConversationType.AD, buyerId: authorId, sellerId },
      select: { id: true, dealConfirmedAt: true }
    })

    const confirmed = conversations
      .filter(conversation => conversation.dealConfirmedAt)
      .sort((a, b) => b.dealConfirmedAt!.getTime() - a.dealConfirmedAt!.getTime())[0]

    if (confirmed) {
      return {
        status: 'ok' as const,
        contactType: SellerReviewContactType.DEAL_CONFIRMED,
        conversationId: confirmed.id
      }
    }

    const [chats, firstReveal] = await Promise.all([
      this.loadChatStats(
        authorId,
        sellerId,
        conversations.map(conversation => conversation.id)
      ),
      this.prisma.adPhoneReveal.findFirst({
        where: { userId: authorId, sellerId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      })
    ])

    const verdict = evaluateContact({ chats, firstPhoneRevealAt: firstReveal?.createdAt ?? null, now })

    return verdict.status === 'ok' ? { ...verdict, contactType: SellerReviewContactType.CONTACT } : verdict
  }

  // Один запрос на все диалоги пары: по сторонам — сколько сообщений и когда
  // первое.
  private async loadChatStats(authorId: string, sellerId: string, conversationIds: string[]): Promise<ChatStats[]> {
    if (conversationIds.length === 0) return []

    const rows = await this.prisma.message.groupBy({
      by: ['conversationId', 'senderId'],
      where: { conversationId: { in: conversationIds }, senderId: { in: [authorId, sellerId] } },
      _count: { _all: true },
      _min: { createdAt: true }
    })

    return conversationIds.map(conversationId => {
      const side = (senderId: string) => {
        const row = rows.find(item => item.conversationId === conversationId && item.senderId === senderId)

        return row?._min.createdAt ? { count: row._count._all, firstAt: row._min.createdAt } : null
      }

      return { conversationId, author: side(authorId), seller: side(sellerId) }
    })
  }
}
