import pathlib

p = pathlib.Path("server/src/conversations/conversations.service.ts")
s = p.read_text(encoding="utf-8")

def replace_once(s, old, new):
    assert s.count(old) == 1, f"expected exactly 1 occurrence, got {s.count(old)}: {old[:80]!r}"
    return s.replace(old, new)

# 1. import Logger
s = replace_once(
    s,
    "import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'",
    "import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'"
)

# 2. import NotificationsService
s = replace_once(
    s,
    "import { BlockedUsersService } from '@/blocked-users/blocked-users.service'\nimport { PrismaService } from '@/prisma/prisma.service'",
    "import { BlockedUsersService } from '@/blocked-users/blocked-users.service'\nimport { NotificationsService } from '@/notifications/notifications.service'\nimport { PrismaService } from '@/prisma/prisma.service'"
)

# 3. constructor + logger field
s = replace_once(
    s,
    "export class ConversationsService {\n  constructor(\n    private readonly prisma: PrismaService,\n    private readonly blockedUsersService: BlockedUsersService\n  ) {}",
    "export class ConversationsService {\n  private readonly logger = new Logger(ConversationsService.name)\n\n  constructor(\n    private readonly prisma: PrismaService,\n    private readonly blockedUsersService: BlockedUsersService,\n    private readonly notificationsService: NotificationsService\n  ) {}"
)

# 4. startConversation call site
s = replace_once(
    s,
    "    const message = await this.createMessage(conversation.id, userId, dto.text)",
    "    const message = await this.createMessage(conversation.id, userId, dto.text, ad.userId, ad.title)"
)

# 5. sendMessage call site
s = replace_once(
    s,
    "    return this.createMessage(conversationId, userId, dto.text, dto.attachments)",
    "    return this.createMessage(conversationId, userId, dto.text, counterpartId, conversation.adTitleSnapshot ?? '', dto.attachments)"
)

# 6. createMessage method
old_method = """  private async createMessage(conversationId: string, senderId: string, text: string, attachments: string[] = []) {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId, senderId, text, attachments } }),
      // Сбрасываем скрытие с обеих сторон при любом новом сообщении — не
      // только у получателя (которому логично снова увидеть диалог, раз ему
      // пишут), но и у самого отправителя: если он писал через "Написать" на
      // странице объявления в диалог, который сам же раньше скрыл, он должен
      // увидеть в списке своё же новое сообщение, а не потерять его.
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), hiddenByBuyer: false, hiddenBySeller: false }
      })
    ])

    return message
  }"""

new_method = """  private async createMessage(
    conversationId: string,
    senderId: string,
    text: string,
    recipientId: string,
    adTitle: string,
    attachments: string[] = []
  ) {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId, senderId, text, attachments } }),
      // Сбрасываем скрытие с обеих сторон при любом новом сообщении — не
      // только у получателя (которому логично снова увидеть диалог, раз ему
      // пишут), но и у самого отправителя: если он писал через "Написать" на
      // странице объявления в диалог, который сам же раньше скрыл, он должен
      // увидеть в списке своё же новое сообщение, а не потерять его.
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), hiddenByBuyer: false, hiddenBySeller: false }
      })
    ])

    // Уведомление получателю о новом сообщении — best-effort: провал не
    // должен ронять отправку самого сообщения. Здесь (в отличие от
    // AdsService.reject/NotificationsService.notifyAdRejected, где в
    // try/catch обёрнута только email-часть) в try/catch весь блок целиком —
    // этот метод вызывается на порядки чаще, и создание самой записи Message
    // не должно зависеть от доступности уведомлений.
    try {
      const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true } })
      await this.notificationsService.notifyNewMessage(
        recipientId,
        conversationId,
        adTitle,
        sender?.displayName ?? 'Пользователь',
        text
      )
    } catch (error) {
      this.logger.error(`Не удалось отправить уведомление о новом сообщении: ${error}`)
    }

    return message
  }"""

s = replace_once(s, old_method, new_method)

p.write_text(s, encoding="utf-8")
print("OK")
