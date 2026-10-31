import { NotificationType } from '@/generated/prisma/client'

// О каких уведомлениях сообщаем ещё и push на телефон. Это решения
// модерации и события, которые продавец иначе заметил бы лишь при случайном
// заходе в приложение. Остальные остаются только в списке уведомлений:
// отзыв скрыт или опубликован — ответ на действие самого автора; сделка
// отмечена — не срочно, приглашение оценить дождётся в списке.
export const PUSH_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.AD_REJECTED,
  NotificationType.AD_PUBLISHED,
  NotificationType.SELLER_WARNING,
  NotificationType.SELLER_ADS_SUSPENDED,
  NotificationType.SELLER_ADS_RESTORED,
  NotificationType.SELLER_REVIEW_RECEIVED,
  NotificationType.SELLER_REVIEW_REPLIED
])

// Нажатие на push открывает раздел «Уведомления» приложения: там событие
// выделено непрочитанным, и одним нажатием открывается нужное объявление,
// отзыв или страница продавца.
export const NOTIFICATIONS_PUSH_LINK = 'agrozone://profile/notifications'

// Текст события длиннее превью сообщения: в нём может быть причина отказа.
export const NOTIFICATION_PUSH_BODY_MAX_LENGTH = 240
