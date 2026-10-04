// Значения — строго как в enum SecurityEventType/SecurityEventActor на
// бэкенде (prisma/schema.prisma). Список расширяемый: компоненты
// отображения (SecurityEventsList) берут подписи из SECURITY_EVENT_META и
// для неизвестного типа показывают нейтральный запасной вариант, поэтому
// новый тип на сервере не ломает старый клиент.
export type SecurityEventType =
  | 'ACCOUNT_REGISTERED'
  | 'ACCOUNT_CREATED_BY_ADMIN'
  | 'ACCOUNT_DELETED'
  | 'LOGIN_NEW_DEVICE'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'PASSWORD_SET_BY_ADMIN'
  | 'EMAIL_CHANGE_REQUESTED'
  | 'EMAIL_CHANGED'
  | 'EMAIL_SET_BY_ADMIN'
  | 'PHONE_ADDED'
  | 'PHONE_CHANGED'
  | 'PRIMARY_PHONE_CHANGED'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'OAUTH_LINKED'
  | 'ROLE_CHANGED'
  | 'PREMIUM_SET_BY_ADMIN'

export type SecurityEventActor = 'USER' | 'ADMIN' | 'SYSTEM'

// Плоские значения — как и на сервере (SecurityEventMetadata). Контакты
// (email/телефон) приходят уже маскированными, полного значения клиент не
// получает никогда.
export type SecurityEventMetadata = Record<string, string | number | boolean | null>

// Запись в том виде, в каком её видит сам пользователь (см.
// SecurityEventForUser на бэкенде): без User-Agent целиком и без id
// администратора.
export interface ISecurityEvent {
  id: string
  type: SecurityEventType
  actor: SecurityEventActor
  ip: string | null
  device: string | null
  metadata: SecurityEventMetadata | null
  createdAt: string
}

// Запись для админки (см. SecurityEventForAdmin).
export interface IAdminSecurityEvent extends ISecurityEvent {
  actorId: string | null
  actorName: string | null
  userAgent: string | null
}

export interface ISecurityEventsPage<T extends ISecurityEvent> {
  items: T[]
  total: number
  page: number
  limit: number
}

// type, а не interface — чтобы TypeScript принял объект там, где ожидается
// TypeSearchParams (у type-алиасов индексная сигнатура выводится сама, у
// interface — нет).
export type IFindSecurityEventsParams = {
  page?: number
  limit?: number
  types?: SecurityEventType[]
}
