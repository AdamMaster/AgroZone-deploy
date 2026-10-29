import { AdReportReason } from '@/components/features/ads/types/ad.types'
import { UserRole, UserType } from '@/components/features/auth/types'
import {
  SellerReportReason,
  SellerReviewContactType,
  SellerReviewReportReason,
  SellerReviewStatus
} from '@/components/features/sellers/types'
import { SiteFlagKey } from '@/components/features/site-settings/types/site-settings.types'

// Значения — строго как в enum AdReportStatus на бэкенде (prisma/schema.prisma).
export enum AdReportStatus {
  Pending = 'PENDING',
  Reviewed = 'REVIEWED',
  Dismissed = 'DISMISSED'
}

export interface IAdReportAd {
  id: string
  title: string
  images: string[]
}

export interface IAdReportUser {
  id: string
  displayName: string | null
}

export interface IAdReportAdmin {
  id: string
  reason: AdReportReason
  comment: string | null
  status: AdReportStatus
  createdAt: string
  ad: IAdReportAd
  user: IAdReportUser
}

// --- Поиск и карточка пользователя (/admin/users) ---

export interface IAdminUserPhone {
  phone: string
  isPrimary: boolean
}

// Короткая карточка на строку результатов поиска (см.
// UserService.searchByAdmin на бэкенде) — специально не полный профиль,
// чтобы список из многих строк не тянул лишнего.
export interface IAdminUserListItem {
  id: string
  displayName: string | null
  email: string | null
  picture: string | null
  type: UserType
  role: UserRole
  premiumUntil: string | null
  isVerified: boolean
  deletedAt: string | null
  createdAt: string
  phones: IAdminUserPhone[]
  _count: { ads: number }
}

export interface IAdminUserSearchResponse {
  items: IAdminUserListItem[]
  total: number
  page: number
  limit: number
}

export interface IAdminUserAccount {
  id: string
  provider: string
  type: string
  createdAt: string
}

// Полная карточка пользователя (/admin/users/:id) — см.
// UserController.findById (GET users/by-id/:id, переиспользован для
// админки — см. комментарий там же про то, почему пароль/OAuth-токены в
// ответе не приходят).
export interface IAdminUserDetail {
  id: string
  email: string | null
  displayName: string | null
  picture: string | null
  bio: string | null
  location: string | null
  type: UserType
  role: UserRole
  hasPassword: boolean
  businessInn: string | null
  businessName: string | null
  businessVerifiedAt: string | null
  premiumUntil: string | null
  isVerified: boolean
  isTwoFactorEnabled: boolean
  deletedAt: string | null
  method: string
  createdAt: string
  phones: Array<{ id: string; phone: string; isPrimary: boolean; isVerified: boolean }>
  accounts: IAdminUserAccount[]
}

// --- Настройки сайта (/admin/settings) ---

export interface ISiteSettingActor {
  id: string
  displayName: string | null
}

export interface IAdminSiteFlag {
  key: SiteFlagKey
  value: boolean
  // null — флаг ещё ни разу не переключали, действует значение по умолчанию.
  updatedAt: string | null
  updatedBy: ISiteSettingActor | null
}

export interface IAdminSiteFlagChange {
  id: string
  key: SiteFlagKey
  value: boolean
  createdAt: string
  // null — аккаунт администратора с тех пор удалён.
  changedBy: ISiteSettingActor | null
}

export interface IAdminSiteSettings {
  flags: IAdminSiteFlag[]
  changes: IAdminSiteFlagChange[]
}

// --- Модерация отзывов о продавцах (/admin/seller-reviews) ---

// Какое правило автофильтра сработало на тексте отзыва.
export enum SellerReviewFilterFlag {
  Profanity = 'PROFANITY',
  Link = 'LINK',
  Phone = 'PHONE',
  RepeatedText = 'REPEATED_TEXT'
}

export enum SellerReviewModerationDecision {
  Publish = 'PUBLISH',
  Hide = 'HIDE'
}

export interface ISellerReviewModerationUser {
  id: string
  displayName: string | null
  email: string | null
  deletedAt: string | null
}

export interface ISellerReviewModerationReport {
  id: string
  reason: SellerReviewReportReason
  comment: string | null
  createdAt: string
  reporter: { id: string; displayName: string | null }
}

export interface ISellerReviewModerationItem {
  id: string
  rating: number
  text: string | null
  status: SellerReviewStatus
  contactType: SellerReviewContactType
  weight: number
  filterFlags: SellerReviewFilterFlag[]
  createdAt: string
  author: ISellerReviewModerationUser
  seller: ISellerReviewModerationUser
  reports: ISellerReviewModerationReport[]
}

export interface ISellerReviewModerationQueue {
  items: ISellerReviewModerationItem[]
  total: number
  page: number
  limit: number
}

// --- Жалобы на продавцов (/admin/seller-reports) ---

export enum SellerReportStatus {
  Pending = 'PENDING',
  Accepted = 'ACCEPTED',
  Dismissed = 'DISMISSED'
}

export enum SellerSanctionType {
  Warning = 'WARNING',
  AdsSuspended = 'ADS_SUSPENDED',
  AdsRestored = 'ADS_RESTORED',
  ReviewsHidden = 'REVIEWS_HIDDEN'
}

export enum SellerReportResolutionAction {
  Dismiss = 'DISMISS',
  Warn = 'WARN',
  SuspendAds = 'SUSPEND_ADS'
}

// Сработавшие сигналы накрутки отзывов — значения как в SellerReviewSignalCode
// на бэкенде.
export enum SellerReviewSignalCode {
  YoungAuthors = 'YOUNG_AUTHORS',
  MostlyUnconfirmed = 'MOSTLY_UNCONFIRMED',
  ReciprocalReviews = 'RECIPROCAL_REVIEWS',
  ReviewBurst = 'REVIEW_BURST',
  SharedIpWithSeller = 'SHARED_IP_WITH_SELLER',
  SharedIpAmongAuthors = 'SHARED_IP_AMONG_AUTHORS'
}

export interface ISellerReportQueueItem {
  seller: {
    id: string
    displayName: string | null
    email: string | null
    createdAt: string
    deletedAt: string | null
  } | null
  pendingReports: number
  oldestReportAt: string
  suspendedAds: number
}

export interface ISellerReportQueue {
  items: ISellerReportQueueItem[]
  total: number
  page: number
  limit: number
}

export interface ISellerReportEntry {
  id: string
  reason: SellerReportReason
  comment: string | null
  status: SellerReportStatus
  createdAt: string
  resolvedAt: string | null
  reporter: { id: string; displayName: string | null; createdAt: string }
  ad: { id: string; title: string } | null
}

export interface ISellerSanctionEntry {
  id: string
  type: SellerSanctionType
  note: string | null
  createdAt: string
  moderator: { id: string; displayName: string | null } | null
}

export interface ISellerReviewSignals {
  totalReviews: number
  unconfirmedReviews: number
  youngAuthorReviews: number
  reciprocalReviews: number
  maxReviewsInWindow: number
  authorsSharingIpWithSeller: number
  authorsSharingIpWithEachOther: number
  flagged: SellerReviewSignalCode[]
}

export interface ISellerReportCard {
  seller: {
    id: string
    displayName: string | null
    email: string | null
    picture: string | null
    type: UserType
    createdAt: string
    deletedAt: string | null
    businessVerifiedAt: string | null
    ratingAverage: number | null
    ratingCount: number
    phones: IAdminUserPhone[]
  }
  // Число объявлений продавца по статусам.
  ads: Record<string, number>
  reports: ISellerReportEntry[]
  sanctions: ISellerSanctionEntry[]
  reviewSignals: ISellerReviewSignals
}

// Журнал попыток регистрации (/admin/registration-attempts). Значения —
// строго как в enum'ах RegistrationAttempt* на бэкенде. ABANDONED — не
// значение из базы: сервер показывает так попытку «в процессе», которая
// давно не двигалась.
export type RegistrationAttemptChannel = 'PHONE' | 'EMAIL'
export type RegistrationAttemptPlatform = 'SITE' | 'APP' | 'UNKNOWN'
export type RegistrationAttemptStatus = 'IN_PROGRESS' | 'FAILED' | 'COMPLETED' | 'ABANDONED'
export type RegistrationAttemptStep = 'STARTED' | 'CONFIRMATION_SENT' | 'COMPLETED'
export type RegistrationFailureReason =
  | 'ALREADY_REGISTERED'
  | 'PROVIDER_ERROR'
  | 'CODE_INVALID'
  | 'CODE_EXPIRED'
  | 'CALL_NOT_RECEIVED'
  | 'LINK_EXPIRED'
  | 'INVALID_DATA'
  | 'UNKNOWN_ERROR'

export type RegistrationAttemptFilter = 'problems' | 'all' | 'completed'

export interface IRegistrationAttempt {
  id: string
  channel: RegistrationAttemptChannel
  contact: string
  platform: RegistrationAttemptPlatform
  status: RegistrationAttemptStatus
  step: RegistrationAttemptStep
  failureReason: RegistrationFailureReason | null
  failureDetail: string | null
  failuresCount: number
  ip: string | null
  device: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  // По этому телефону или почте теперь есть аккаунт — человек всё же вошёл.
  registeredLater: boolean
}

export interface IRegistrationAttemptsPage {
  items: IRegistrationAttempt[]
  total: number
  page: number
  limit: number
  summary: { days: number; total: number; completed: number; problems: number }
}
