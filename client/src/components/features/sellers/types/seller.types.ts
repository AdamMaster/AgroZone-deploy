import { UserType } from '@/components/features/auth/types'

// Публичная карточка продавца (/sellers/:id) — намеренно НЕ переиспользует
// IUser (тот тип — для владельца собственного аккаунта, там email,
// телефоны, служебные флаги). Тут ровно тот набор полей, что отдаёт
// GET /users/:id/public (см. UserService.getPublicProfile на бэкенде) —
// безопасно показывать кому угодно.
export interface IPublicSeller {
  id: string
  displayName: string | null
  picture: string | null
  type: UserType
  businessName: string | null
  businessVerifiedAt: string | null
  premiumUntil: string | null
  createdAt: string
  adsCount: number
}
