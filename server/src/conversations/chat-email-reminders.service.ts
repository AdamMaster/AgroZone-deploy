import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import type { Message } from '@/generated/prisma/client'

import { NotificationsService } from '@/notifications/notifications.service'
import { PrismaService } from '@/prisma/prisma.service'

import {
  CHAT_EMAIL_BATCH_SIZE,
  CHAT_EMAIL_CONCURRENCY,
  CHAT_EMAIL_COOLDOWN_MS,
  CHAT_EMAIL_DELAY_MS,
  CHAT_EMAIL_MAX_BATCHES
} from './constants/conversations.constants'

interface DueReminder {
  conversationId: string
  recipientId: string
}

// Письма о новых сообщениях в чате: не сразу, а через CHAT_EMAIL_DELAY_MS и
// только тому, кто за это время сообщение так и не прочитал. Тот, кто сидел в
// чате, получил push или уже ответил, письма не получает (раньше оно уходило
// всегда и дублировало push). Пользователь может отключить такие письма
// совсем (User.chatEmailNotifications).
//
// Устройство: на первое непрочитанное сообщение диалога ставится напоминание
// (строка ChatEmailReminder, одна на пару «диалог — получатель»), воркер раз в
// минуту забирает созревшие, перепроверяет, что сообщение всё ещё не прочитано,
// и отправляет письмо. Строка удаляется в момент выбора воркером, до отправки:
// письмо уходит не больше одного раза, а при сбое на отправке теряется — для
// уведомления это лучше дубля (повтор отправил бы то же письмо ещё раз).
@Injectable()
export class ChatEmailRemindersService {
  private readonly logger = new Logger(ChatEmailRemindersService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  // Вызывается после сохранения сообщения. Никогда не бросает: уведомление —
  // удобство, и сбой постановки напоминания не должен ронять отправку самого
  // сообщения (метод вызывается на порядки чаще остального).
  async scheduleForMessage(message: Message, recipientId: string): Promise<void> {
    try {
      const [recipient, conversation] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: recipientId },
          select: { email: true, deletedAt: true, chatEmailNotifications: true }
        }),
        this.prisma.conversation.findUnique({
          where: { id: message.conversationId },
          select: { buyerId: true, buyerLastReadAt: true, sellerLastReadAt: true }
        })
      ])

      if (!recipient?.email || recipient.deletedAt || !recipient.chatEmailNotifications || !conversation) return

      const lastReadAt =
        conversation.buyerId === recipientId ? conversation.buyerLastReadAt : conversation.sellerLastReadAt

      if (await this.hasEarlierUnreadFromSender(message, lastReadAt)) return

      // skipDuplicates: напоминание на этот диалог уже стоит — второе не нужно,
      // созревание считается от первого непрочитанного сообщения.
      await this.prisma.chatEmailReminder.createMany({
        data: [
          {
            conversationId: message.conversationId,
            recipientId,
            dueAt: new Date(message.createdAt.getTime() + CHAT_EMAIL_DELAY_MS)
          }
        ],
        skipDuplicates: true
      })
    } catch (error) {
      this.logger.error(`Не удалось запланировать письмо о сообщении: ${(error as Error).message}`)
    }
  }

  // Письмо — на первое непрочитанное сообщение, а не на каждое: пока получатель
  // не открыл диалог, новые сообщения того же отправителя в течение
  // CHAT_EMAIL_COOLDOWN_MS напоминаний не порождают (серия из 30 сообщений —
  // одно письмо, а не тридцать). Если получатель молчит дольше, следующее
  // сообщение напомнит о себе новым письмом.
  private async hasEarlierUnreadFromSender(message: Message, lastReadAt: Date | null): Promise<boolean> {
    const windowStart = new Date(message.createdAt.getTime() - CHAT_EMAIL_COOLDOWN_MS)
    const since = lastReadAt && lastReadAt > windowStart ? lastReadAt : windowStart

    const earlierUnread = await this.prisma.message.count({
      where: {
        conversationId: message.conversationId,
        senderId: message.senderId,
        createdAt: { gte: since, lt: message.createdAt }
      }
    })

    return earlierUnread > 0
  }

  // Один проход воркера: забирает созревшие напоминания пачками и рассылает
  // письма. Возвращает число отправленных писем (для лога).
  async processDue(now: Date = new Date()): Promise<number> {
    let sent = 0

    for (let batch = 0; batch < CHAT_EMAIL_MAX_BATCHES; batch += 1) {
      const due = await this.claimDue(now, CHAT_EMAIL_BATCH_SIZE)

      for (let index = 0; index < due.length; index += CHAT_EMAIL_CONCURRENCY) {
        const results = await Promise.all(
          due.slice(index, index + CHAT_EMAIL_CONCURRENCY).map(reminder => this.sendReminder(reminder))
        )

        sent += results.filter(Boolean).length
      }

      if (due.length < CHAT_EMAIL_BATCH_SIZE) break
    }

    return sent
  }

  // Атомарно забирает созревшие напоминания: DELETE ... RETURNING с блокировкой
  // SKIP LOCKED — два одновременных воркера (второй экземпляр сервера, наложение
  // запусков) не возьмут одну и ту же строку и не отправят письмо дважды.
  private claimDue(now: Date, limit: number): Promise<DueReminder[]> {
    return this.prisma.$queryRaw<DueReminder[]>(Prisma.sql`
      DELETE FROM chat_email_reminders
      WHERE id IN (
        SELECT id FROM chat_email_reminders
        WHERE due_at <= ${now}
        ORDER BY due_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING conversation_id AS "conversationId", recipient_id AS "recipientId"
    `)
  }

  // true — письмо отправлено. Сбой одного письма не должен останавливать
  // остальные в пачке.
  private async sendReminder({ conversationId, recipientId }: DueReminder): Promise<boolean> {
    try {
      const [recipient, conversation] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: recipientId },
          select: { email: true, deletedAt: true, chatEmailNotifications: true }
        }),
        this.prisma.conversation.findUnique({
          where: { id: conversationId },
          select: {
            buyerId: true,
            sellerId: true,
            buyerLastReadAt: true,
            sellerLastReadAt: true,
            adTitleSnapshot: true,
            ad: { select: { title: true } }
          }
        })
      ])

      // За время ожидания пользователь мог отключить письма или удалить аккаунт.
      if (!recipient?.email || recipient.deletedAt || !recipient.chatEmailNotifications || !conversation) return false

      const isBuyer = conversation.buyerId === recipientId
      const counterpartId = isBuyer ? conversation.sellerId : conversation.buyerId
      const lastReadAt = isBuyer ? conversation.buyerLastReadAt : conversation.sellerLastReadAt

      if (!counterpartId) return false

      // Последнее непрочитанное сообщение собеседника; нет такого — получатель
      // за время ожидания открыл диалог, письмо не нужно.
      const unread = await this.prisma.message.findFirst({
        where: {
          conversationId,
          senderId: counterpartId,
          deletedAt: null,
          ...(lastReadAt && { createdAt: { gt: lastReadAt } })
        },
        orderBy: { createdAt: 'desc' },
        select: { text: true, attachments: true, sender: { select: { displayName: true } } }
      })

      if (!unread) return false

      await this.notificationsService.notifyNewMessageByEmail(
        recipientId,
        conversationId,
        conversation.adTitleSnapshot ?? conversation.ad?.title ?? '',
        unread.sender?.displayName ?? 'Пользователь',
        // Сообщение только с фото: в превью письма вместо пустого текста.
        unread.text.trim() || (unread.attachments.length ? 'Фото' : '')
      )

      return true
    } catch (error) {
      this.logger.error(
        `Не удалось отправить письмо о сообщении (диалог ${conversationId}): ${(error as Error).message}`
      )

      return false
    }
  }
}
