import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { PrismaService } from '@/prisma/prisma.service'
import { PUSH_CONVERSATION_COOLDOWN_MS } from '@/push/constants/push.constants'
import { PushService } from '@/push/push.service'
import { truncatePushBody } from '@/push/utils/truncate-push-body.util'

import { CONVERSATION_MESSAGE_CREATED_EVENT, ConversationMessageCreatedPayload } from './conversations.events'
import { ConversationsGateway } from './conversations.gateway'

// Push о новом сообщении тому, кто сейчас не смотрит чат. Живую доставку по
// сокету (сайт открыт, приложение на экране) делает ConversationsGateway; push
// нужен, когда сокета нет: приложение свёрнуто или закрыто. Письмо
// (ConversationsService.publishMessage) — отдельный канал, не заменяемый пушем.
@Injectable()
export class ConversationsPushListener {
  private readonly logger = new Logger(ConversationsPushListener.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly gateway: ConversationsGateway
  ) {}

  @OnEvent(CONVERSATION_MESSAGE_CREATED_EVENT, { async: true })
  async handleMessageCreated({ message, participantIds }: ConversationMessageCreatedPayload): Promise<void> {
    try {
      const [senderId, recipientId] = participantIds

      // Получатель на связи — сообщение дошло по сокету, звонить в карман лишнее.
      if (this.gateway.isUserOnline(recipientId)) {
        this.logger.log(`Push не нужен: получатель ${recipientId} в сети (сообщение ${message.id})`)

        return
      }

      const conversation = await this.prisma.conversation.findUnique({
        where: { id: message.conversationId },
        select: { buyerId: true, buyerLastReadAt: true, sellerLastReadAt: true }
      })

      if (!conversation) return

      const lastReadAt =
        conversation.buyerId === recipientId ? conversation.buyerLastReadAt : conversation.sellerLastReadAt

      // Продолжение серии: новое сообщение лишь обновляет текст уведомления
      // там, где это возможно (FCM); остальные каналы уже оповещены.
      const followUp = await this.hasRecentUnreadFromSender(message, senderId, lastReadAt)

      const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true } })
      const text = message.text.trim()

      await this.pushService.sendToUser(
        recipientId,
        {
          title: sender?.displayName ?? 'Новое сообщение',
          body: text ? truncatePushBody(text) : 'Фото',
          // Нажатие открывает именно этот чат в приложении (экран chat/[id]).
          link: `agrozone://chat/${message.conversationId}`,
          data: { conversationId: message.conversationId }
        },
        { followUp }
      )
    } catch (error) {
      this.logger.error(`Не удалось отправить push о сообщении: ${(error as Error).message}`)
    }
  }

  // Серия сообщений подряд: пока получатель не прочёл предыдущее, новые в
  // течение PUSH_CONVERSATION_COOLDOWN_MS — продолжение серии (см. followUp).
  private async hasRecentUnreadFromSender(
    message: ConversationMessageCreatedPayload['message'],
    senderId: string,
    lastReadAt: Date | null
  ): Promise<boolean> {
    const windowStart = new Date(message.createdAt.getTime() - PUSH_CONVERSATION_COOLDOWN_MS)
    const since = lastReadAt && lastReadAt > windowStart ? lastReadAt : windowStart

    const earlier = await this.prisma.message.count({
      where: { conversationId: message.conversationId, senderId, createdAt: { gte: since, lt: message.createdAt } }
    })

    return earlier > 0
  }
}
