import { Injectable } from '@nestjs/common'
import { Request } from 'express'
import { ConversationType } from '@/generated/prisma/enums'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class SupportGuestsService {
  constructor(private readonly prisma: PrismaService) {}

  // Найти гостя текущей сессии или завести нового. Именно тут, а не в
  // гварде, живёт вся Prisma-логика — гвард только решает, звать ли этот
  // метод. Запись id в request.session — единственное место, где вообще
  // появляется supportGuestId; дальше сессия (Redis) делает всю работу
  // сама (см. express-session.d.ts).
  async getOrCreateForSession(request: Request) {
    const existingId = request.session.supportGuestId

    if (existingId) {
      const guest = await this.prisma.supportGuest.findUnique({ where: { id: existingId } })

      if (guest) {
        // fire-and-forget: не блокируем ответ ради обновления "последний
        // раз видели" — это не критично, если изредка не долетит.
        void this.prisma.supportGuest
          .update({ where: { id: guest.id }, data: { lastSeenAt: new Date() } })
          .catch(() => {})

        return guest
      }

      // Ссылка в сессии протухла (запись гостя физически удалена — сейчас
      // такого пути в коде нет, но лучше не падать, если появится) —
      // заводим нового ниже, как будто supportGuestId не было вовсе.
    }

    const guest = await this.prisma.supportGuest.create({
      data: {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      }
    })

    request.session.supportGuestId = guest.id

    return guest
  }

  // Только чтение, без создания и без побочных эффектов (в отличие от
  // getOrCreateForSession) — нужен SupportGateway на хэндшейке сокета, где
  // заводить нового гостя нельзя (см. SupportIdentityService.resolveForHandshake).
  async findExisting(guestId: string) {
    return this.prisma.supportGuest.findUnique({ where: { id: guestId } })
  }

  // Бан гостя админом прямо из чата (см. SupportController) — история
  // диалога не трогается, просто следующее сообщение от этого гостя
  // отклонится в SupportIdentityGuard.
  async block(guestId: string) {
    await this.prisma.supportGuest.update({
      where: { id: guestId },
      data: { blockedAt: new Date() }
    })
  }

  async unblock(guestId: string) {
    await this.prisma.supportGuest.update({
      where: { id: guestId },
      data: { blockedAt: null }
    })
  }

  // "Приклеить" гостевую переписку к аккаунту после регистрации/логина —
  // вызывается из AuthService.saveSession (единственная точка входа/
  // регистрации независимо от способа — пароль, SMS, Google, Yandex, см.
  // комментарий там же): если в сессии на момент входа был supportGuestId,
  // его SUPPORT-диалог переезжает на нового userId, а сама запись
  // SupportGuest остаётся как исторический след через mergedIntoUserId, не
  // удаляется.
  async mergeIntoUser(guestId: string, userId: string) {
    // guestId уникален для SUPPORT-диалога (см. partial unique index
    // conversation_support_guest_unique в миграции) — гость физически не
    // мог написать в два разных тикета, findFirst тут равносилен
    // findUnique.
    const guestConversation = await this.prisma.conversation.findFirst({
      where: { guestId, type: ConversationType.SUPPORT }
    })

    if (!guestConversation) {
      // Гость залогинился/зарегистрировался, ни разу не писав в
      // поддержку — переносить нечего, но факт "эта гостевая сессия
      // принадлежит теперь этому юзеру" всё равно стоит зафиксировать.
      await this.prisma.supportGuest.update({ where: { id: guestId }, data: { mergedIntoUserId: userId } })
      return null
    }

    // У юзера уже мог быть свой SUPPORT-тикет (писал раньше залогиненным, с
    // другого устройства и т.п.) — тогда просто переприсвоить guestId ->
    // buyerId на Conversation нельзя: получится вторая запись с тем же
    // buyerId при типе SUPPORT, а partial unique index
    // conversation_support_buyer_unique уронит транзакцию. Вместо этого
    // сообщения гостя переезжают ВНУТРЬ существующего тикета юзера, а
    // пустая гостевая запись диалога удаляется.
    const existingUserConversation = await this.prisma.conversation.findFirst({
      where: { buyerId: userId, type: ConversationType.SUPPORT }
    })

    if (existingUserConversation) {
      const mergedLastMessageAt = [existingUserConversation.lastMessageAt, guestConversation.lastMessageAt]
        .filter((d): d is Date => d !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0]

      await this.prisma.$transaction([
        // Сообщения, отправленные самим гостем, — переезжают с новым
        // senderId. Сообщения админа в этом же диалоге (senderGuestId уже
        // null) — просто переезжают в другой conversationId, отправителя
        // не трогаем.
        this.prisma.message.updateMany({
          where: { conversationId: guestConversation.id, senderGuestId: guestId },
          data: { conversationId: existingUserConversation.id, senderGuestId: null, senderId: userId }
        }),
        this.prisma.message.updateMany({
          where: { conversationId: guestConversation.id, senderGuestId: null },
          data: { conversationId: existingUserConversation.id }
        }),
        this.prisma.conversation.update({
          where: { id: existingUserConversation.id },
          data: { lastMessageAt: mergedLastMessageAt ?? existingUserConversation.lastMessageAt }
        }),
        this.prisma.conversation.delete({ where: { id: guestConversation.id } }),
        this.prisma.supportGuest.update({ where: { id: guestId }, data: { mergedIntoUserId: userId } })
      ])

      return existingUserConversation.id
    }

    await this.prisma.$transaction([
      this.prisma.conversation.update({
        where: { id: guestConversation.id },
        data: { guestId: null, buyerId: userId }
      }),
      this.prisma.message.updateMany({
        where: { senderGuestId: guestId },
        data: { senderGuestId: null, senderId: userId }
      }),
      this.prisma.supportGuest.update({
        where: { id: guestId },
        data: { mergedIntoUserId: userId }
      })
    ])

    return guestConversation.id
  }
}
