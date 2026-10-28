import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { NotificationType } from '@/generated/prisma/client'

import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'

import { FindNotificationsQueryDto } from './dto/find-notifications-query.dto'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async findMyNotifications(userId: string, query: FindNotificationsQueryDto) {
    const page = query.page ?? 1
    const limit = Math.min(query.limit ?? 20, 50)
    const skip = (page - 1) * limit

    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(query.isRead !== undefined && { isRead: query.isRead })
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false }
    })

    return { count }
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } })

    if (!notification) {
      throw new NotFoundException('Уведомление не найдено')
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Это уведомление принадлежит другому пользователю')
    }

    if (notification.isRead) {
      return notification
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true }
    })
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    })

    return { success: true }
  }

  // Вызывается из AdsService.reject() в момент отклонения объявления
  // модератором — раньше об этом можно было узнать только зайдя в "Мои
  // объявления" и заметив иконку с причиной (см. обсуждение с
  // пользователем). Дублируем письмом (см. обсуждение — фаза 2): in-app
  // уведомление доходит только если продавец сам зайдёт на сайт, письмо —
  // независимо от этого.
  async notifyAdRejected(userId: string, adId: string, adTitle: string, reason: string | null) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.AD_REJECTED,
        title: 'Объявление отклонено',
        message: reason
          ? `Объявление «${adTitle}» отклонено модератором. Причина: ${reason}`
          : `Объявление «${adTitle}» отклонено модератором.`,
        link: `/ads/${adId}/edit`
      }
    })

    // В отличие от записи в БД выше (намеренно без try/catch — это
    // локальная база, падать не должна, и если упадёт, лучше явно увидеть
    // 500), письмо — внешний сервис, зависящий от сети/SMTP. Если оно не
    // отправится, продавец всё равно узнает через in-app уведомление
    // (только что созданное) — падать из-за письма и мешать самому
    // отклонению объявления не должны.
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      })

      // Email необязателен (можно зарегистрироваться только по телефону,
      // см. User.email в схеме) — тогда просто не отправляем письмо.
      if (user?.email) {
        await this.mailService.sendAdRejectedEmail(user.email, adId, adTitle, reason)
      }
    } catch (error) {
      this.logger.error(`Не удалось отправить письмо об отклонении объявления ${adId}`, error)
    }

    return notification
  }

  // Вызывается из ConversationsService при каждом новом сообщении в
  // диалоге по объявлению. Только письмо: в список уведомлений («Объявление
  // отклонено», «Отзыв скрыт» и т. п.) новые сообщения НЕ попадают — они
  // дублировали бы вкладку «Сообщения», где у диалога есть счётчик
  // непрочитанного (шапка и нижняя панель сайта, вкладка приложения), и
  // заваливали бы колокольчик по записи на каждое сообщение. Письмо
  // необязательно (email может отсутствовать — регистрация по телефону, см.
  // User.email в схеме): падать из-за него отправка сообщения не должна.
  //
  // messageText обрезается до превью — это письмо, а не сам чат.
  async notifyNewMessageByEmail(
    recipientId: string,
    conversationId: string,
    adTitle: string,
    senderName: string,
    messageText: string
  ) {
    const MESSAGE_PREVIEW_LENGTH = 200
    const trimmedText = messageText.trim()
    const preview =
      trimmedText.length > MESSAGE_PREVIEW_LENGTH ? `${trimmedText.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : trimmedText

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: recipientId },
        select: { email: true }
      })

      if (user?.email) {
        await this.mailService.sendNewMessageEmail(user.email, conversationId, adTitle, senderName, preview)
      }
    } catch (error) {
      this.logger.error(`Не удалось отправить письмо о новом сообщении (диалог ${conversationId})`, error)
    }
  }

  // Решения модератора по отзыву автора. Только in-app: это ответ на его
  // действие на сайте, а не событие, о котором нужно сообщать письмом. Не
  // идёт через try/catch — запись в локальную базу, см. notifyAdRejected.
  async notifySellerReviewHidden(authorId: string, sellerId: string) {
    return this.prisma.notification.create({
      data: {
        userId: authorId,
        type: NotificationType.SELLER_REVIEW_HIDDEN,
        title: 'Отзыв скрыт модератором',
        message: 'Ваш отзыв о продавце нарушает правила площадки и скрыт. В рейтинг он не входит.',
        link: `/sellers/${sellerId}`
      }
    })
  }

  async notifySellerReviewPublished(authorId: string, sellerId: string) {
    return this.prisma.notification.create({
      data: {
        userId: authorId,
        type: NotificationType.SELLER_REVIEW_PUBLISHED,
        title: 'Отзыв опубликован',
        message: 'Модератор проверил ваш отзыв о продавце — он опубликован и учтён в рейтинге.',
        link: `/sellers/${sellerId}`
      }
    })
  }

  // Меры модератора по жалобам на продавца. Только in-app, как и решения по
  // отзывам: продавец увидит их в уведомлениях, а объявления — в «Моих
  // объявлениях».
  async notifySellerWarning(sellerId: string) {
    return this.prisma.notification.create({
      data: {
        userId: sellerId,
        type: NotificationType.SELLER_WARNING,
        title: 'Предупреждение от модератора',
        message:
          'На вас поступили жалобы от покупателей, модератор их проверил. Повторные нарушения правил площадки приведут к более строгим мерам.',
        link: '/safety'
      }
    })
  }

  async notifySellerAdsSuspended(sellerId: string) {
    return this.prisma.notification.create({
      data: {
        userId: sellerId,
        type: NotificationType.SELLER_ADS_SUSPENDED,
        title: 'Объявления приостановлены',
        message:
          'На вас поступило несколько жалоб, поэтому объявления скрыты до проверки модератором. Пока она идёт, изменить или удалить их нельзя.',
        link: '/profile/settings/ads'
      }
    })
  }

  async notifySellerAdsRestored(sellerId: string) {
    return this.prisma.notification.create({
      data: {
        userId: sellerId,
        type: NotificationType.SELLER_ADS_RESTORED,
        title: 'Объявления снова опубликованы',
        message: 'Модератор завершил проверку жалоб, ваши объявления снова доступны покупателям.',
        link: '/profile/settings/ads'
      }
    })
  }

  // Отзывы. Только in-app, как и остальные уведомления рейтингов. Продавцу —
  // когда о нём появился опубликованный отзыв (сразу или после проверки
  // модератором), автору — когда продавец впервые ответил на его отзыв.
  // Вызываются вне транзакций отзывов: сбой уведомления не должен ронять
  // сам отзыв, см. SellerReviewsService.
  async notifySellerReviewReceived(sellerId: string) {
    return this.prisma.notification.create({
      data: {
        userId: sellerId,
        type: NotificationType.SELLER_REVIEW_RECEIVED,
        title: 'Новый отзыв о вас',
        message: 'Покупатель оставил отзыв. Прочитать его и ответить можно на вашей странице продавца.',
        link: `/sellers/${sellerId}?tab=reviews`
      }
    })
  }

  async notifySellerReviewReplied(authorId: string, sellerId: string) {
    return this.prisma.notification.create({
      data: {
        userId: authorId,
        type: NotificationType.SELLER_REVIEW_REPLIED,
        title: 'Продавец ответил на ваш отзыв',
        message: 'Ответ продавца виден под вашим отзывом на его странице.',
        link: `/sellers/${sellerId}?tab=reviews`
      }
    })
  }

  // Покупателю: продавец отметил сделку состоявшейся. Приглашение оценить
  // продавца: кнопка «Оставить отзыв» живёт внутри диалога, и без уведомления
  // многие в него не вернулись бы. Только in-app, ссылка ведёт в сам диалог.
  async notifyDealConfirmed(buyerId: string, conversationId: string) {
    return this.prisma.notification.create({
      data: {
        userId: buyerId,
        type: NotificationType.SELLER_DEAL_CONFIRMED,
        title: 'Продавец отметил сделку состоявшейся',
        message: 'Вы можете оценить продавца: откройте диалог и нажмите «Оставить отзыв».',
        link: `/profile/settings/messages?c=${conversationId}`
      }
    })
  }
}
