import { AdReportReason } from '@/components/features/ads/types/ad.types'
import { UserRole, UserType } from '@/components/features/auth/types'

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
