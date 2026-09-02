import { UserType } from '../../auth/types'
import { ICategory, ICategoryFeature } from '../../categories/types/categories.types'

// ICategory/ICategoryFeature раньше были продублированы здесь и в
// categories/types/categories.types.ts — два независимых определения с
// одинаковым именем успели разойтись по составу полей (тут был units,
// там — isBack, и наоборот). Категория — сущность фичи categories, так что
// каноническое определение теперь там; тут импортируем его и тут же
// ре-экспортируем — второе нужно для обратной совместимости всех мест,
// которые до сих пор импортируют ICategory именно отсюда.
export type { ICategory, ICategoryFeature }

export interface IAdUser {
  id: string
  phone?: string | null
  displayName: string
  picture?: string | null
  createdAt?: Date
  // Сколько ещё активных (опубликованных, не просроченных) объявлений есть
  // у этого продавца, помимо текущего — отдаётся только в GET /ads/:id
  // (публичная карточка объявления), поэтому опционально: в списках
  // (findAll и т.п.) это поле не приходит.
  adsCount?: number
  // Частное лицо / ИП / компания — по той же причине опционально: приходит
  // только с GET /ads/:id.
  type?: UserType
  // Готовое к показу название из DaData ("ИП Иванов И.И." / "ООО РОМАШКА")
  // — есть только если продавец подтвердил ИП/компанию через ИНН и только
  // тогда, когда businessVerifiedAt не null (см. AdDetail — при показе
  // сверяемся именно с businessVerifiedAt, а не с наличием businessName
  // самим по себе).
  businessName?: string | null
  businessVerifiedAt?: string | null
  // Для бейджа "Премиум" рядом с именем продавца (см. AdDetail) — та же
  // причина опциональности, что и у остальных полей выше. Сырое значение
  // с бэкенда, активность проверяется на фронте через isPremiumActive из
  // '@/shared/utils/user.util'.
  premiumUntil?: string | null
}

export interface IAd {
  id: string
  title: string
  description: string
  price: number | null
  unit?: string
  address: string
  phone: string
  images: string[]
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | 'EXPIRED'
  expiresAt: Date | null
  publishedAt: Date | null
  lat: number
  lng: number
  region?: string | null
  regionIsoCode?: string | null
  locality?: string | null
  localityFiasId?: string | null
  features: ICategoryFeature
  createdAt: Date
  updatedAt: Date
  userId: string
  user?: IAdUser
  categoryId: string
  category?: {
    id: string
    name: string
    slug?: string
    fullPath?: string
  }
  rejectionReason?: string
  isFavorite?: boolean
  // Когда объявление в последний раз "подняли" (платно или автоматически) —
  // влияет на сортировку каталога (см. ads.service.ts на бэкенде, DATE_DESC:
  // COALESCE(bumped_at, created_at)). Пока активна платная услуга
  // "Поднять объявление" (bumpServiceUntil) или премиум у владельца
  // объявления, этот момент раз в сутки обновляется автоматически — см.
  // AdAutoBumpWorker на бэкенде.
  bumpedAt?: Date | string | null
  // До какого момента активна платная услуга "Поднять объявление" — пока
  // это в будущем, объявление раз в сутки само поднимается в топ (см.
  // AdAutoBumpWorker). Null/дата в прошлом — услуга не куплена/закончилась.
  bumpServiceUntil?: Date | string | null
  // До какого момента активна услуга "Выделить цену" — та же "лесенка",
  // что и у bumpServiceUntil (см. AdServicesService.reconcilePayment на
  // бэкенде). Null/дата в прошлом — услуга не куплена/закончилась.
  priceHighlightUntil?: Date | string | null
  // Значок объявления и до какого момента он активен — в отличие от
  // bumpServiceUntil/priceHighlightUntil НЕ "лесенка": новая покупка
  // заменяет текущий значок, а не продлевает его же (см. schema.prisma).
  badge?: AdBadge | null
  badgeUntil?: Date | string | null
}

// Значения — строго как в enum AdReportReason на бэкенде (prisma/schema.prisma).
export enum AdReportReason {
  Scam = 'SCAM',
  WrongCategory = 'WRONG_CATEGORY',
  ProhibitedItem = 'PROHIBITED_ITEM',
  Duplicate = 'DUPLICATE',
  Spam = 'SPAM',
  Other = 'OTHER'
}

export interface ICreateAdReportDto {
  reason: AdReportReason
  comment?: string
}

export interface IUpdateAdDto {
  title?: string
  description?: string
  price?: number
  unit?: string
  address?: string
  images?: string[]
  lat?: number
  lng?: number
  features?: Record<string, unknown>
  categoryId?: string
}

// Форма объявления в очереди модерации (GET /ads/pending) — отличается от
// обычного IAd: category и user отдаются полными объектами (не опционально,
// не в укороченном виде), плюс у user есть email/телефон — модератору нужно
// иметь возможность связаться с продавцом, на публичной карточке объявления
// эти поля никогда не отдаются.
export interface IPendingAdUser {
  id: string
  displayName: string | null
  email: string | null
  phones: { phone: string }[]
}

export interface IPendingAdCategory {
  id: string
  name: string
  fullPath: string
}

export interface IPendingAd {
  id: string
  title: string
  price: number | null
  images: string[]
  address: string
  createdAt: string
  category: IPendingAdCategory
  user: IPendingAdUser
}

// Полная карточка объявления для превью модератора (GET /ads/:id/moderation)
// — по сути тот же IAd, но с "владельческим" видом на продавца (email и
// телефон напрямую, как в IPendingAd/IPendingAdUser, а не скрытый номер
// как на публичной странице) и без опциональности статус-зависимых полей.
export type IModerationAd = Omit<IAd, 'user' | 'category'> & {
  user: IPendingAdUser | null
  category: IPendingAdCategory
}

export type AdCardData = Pick<
  IAd,
  | 'id'
  | 'title'
  | 'price'
  | 'images'
  | 'address'
  | 'locality'
  | 'createdAt'
  | 'isFavorite'
  | 'user'
  | 'badge'
  | 'badgeUntil'
  | 'priceHighlightUntil'
>
export type AdCardListData = Pick<
  IAd,
  | 'id'
  | 'title'
  | 'description'
  | 'price'
  | 'images'
  | 'address'
  | 'locality'
  | 'createdAt'
  | 'isFavorite'
  | 'user'
  | 'badge'
  | 'badgeUntil'
  | 'priceHighlightUntil'
>

// Ответ GET /ads — с приходом фильтра каталогу нужен total (количество
// найденных объявлений), поэтому эндпоинт отдаёт не голый массив, а объект.
export interface IAdsListResponse {
  items: IAd[]
  total: number
  page: number
  limit: number
}

// Ответ GET /ads/locations — реальные локации (регионы целиком и
// конкретные города/сёла), где прямо сейчас есть опубликованные
// объявления (см. AdsService.getAvailableLocations на бэкенде), для
// фильтра каталога по местоположению. Один список на два уровня
// специфичности — 'region' (выбор фильтрует весь регион целиком) и
// 'locality' (точечный фильтр по конкретному городу/селу, через
// стабильный ФИАС-id, а не сравнение строк).
// Значения — строго как в enum AdBumpStatus на бэкенде (prisma/schema.prisma).
export type AdBumpStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELED'

export interface IAdBump {
  id: string
  adId: string
  userId: string
  status: AdBumpStatus
  amount: number
  yookassaPaymentId?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ICreateBumpCheckoutResponse {
  confirmationUrl: string
  bumpId: string
}

// Значения — строго как в enum AdServiceType на бэкенде (prisma/schema.prisma).
// Единая страница "Поднять просмотры" — продавец может купить любой набор
// сразу одним платежом (см. AdServicePurchase/AdServicesService на бэкенде).
export type AdServiceType = 'BUMP' | 'PRICE_HIGHLIGHT' | 'BADGE'

// Значения — строго как в enum AdBadge на бэкенде.
export type AdBadge = 'URGENT' | 'NEGOTIABLE' | 'NEW'

// Значения — строго как в enum AdServicePurchaseStatus на бэкенде.
export type AdServicePurchaseStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELED'

export interface IAdServicePurchase {
  id: string
  adId: string
  userId: string
  amount: number
  services: AdServiceType[]
  badge?: AdBadge | null
  status: AdServicePurchaseStatus
  yookassaPaymentId?: string | null
  createdAt: string
  paidAt?: string | null
}

export interface ICreateAdServiceCheckoutResponse {
  confirmationUrl: string
  purchaseId: string
}

// Статистика просмотров — приватная, только для владельца объявления (и
// админа), см. AdsController.getMyAdViewStats/getAdViewStatsForAdmin.
export interface IAdViewStatsDay {
  date: string
  views: number
}

export interface IAdViewStats {
  weekStart: string
  weekEnd: string
  weekOffset: number
  maxWeekOffset: number
  total: number
  days: IAdViewStatsDay[]
}

// Компактные счётчики для панели над фото на странице объявления владельца
// (см. AdsController.getMyAdCounters) — в отличие от IAdViewStats, без
// разбивки по дням, лёгкий запрос.
export interface IAdCounters {
  viewsTotal: number
  viewsToday: number
  favoritesCount: number
}

export type LocationOptionType = 'region' | 'locality'

export interface ILocationOption {
  type: LocationOptionType
  label: string
  // Регионы и локальности, пришедшие из реальных объявлений, всегда несут
  // ISO-код региона (см. AdsService.getAvailableLocations). У городов из
  // статичного справочника RuCity (доступны для поиска даже без единого
  // объявления) его нет — мы намеренно не хардкодим ISO 3166-2:RU коды.
  regionIsoCode?: string
  localityFiasId?: string
}
