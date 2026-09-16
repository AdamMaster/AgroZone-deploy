export enum UserRole {
  Regular = 'REGULAR',
  Admin = 'ADMIN',
  Premium = 'PREMIUM'
}

export enum AuthMethod {
  Credentials = 'CREDENTIALS',
  Google = 'GOOGLE',
  Yandex = 'YANDEX'
}

// Чисто информационная метка типа продавца на карточке объявления —
// без привязанных к ней привилегий на площадке.
export enum UserType {
  Individual = 'INDIVIDUAL',
  IndividualEntrepreneur = 'INDIVIDUAL_ENTREPRENEUR',
  Business = 'BUSINESS'
}

// Сервер (UserService.getProfileForClient) отдаёт по каждому связанному
// аккаунту только эти безопасные поля — ни хэш пароля, ни тем более живые
// OAuth access/refresh токены (Account.accessToken/refreshToken на
// бэкенде) в ответ клиенту не попадают, см. комментарий там же.
export interface IAccount {
  id: string
  createdAt: string
  type: string
  provider: string
}

export interface IUser {
  id: string
  createdAt: string
  updatedAt: string
  email?: string
  phones: IUserPhone[]
  primaryPhone?: string | null
  // Сервер отдаёт только булев флаг — установлен пароль у аккаунта или
  // нет (OAuth-only аккаунт создан без него), сам хэш в ответ не
  // попадает (см. UserService.getProfileForClient).
  hasPassword: boolean
  displayName?: string
  picture?: string
  role: UserRole
  isVerified: boolean
  isTwoFactorEnabled: boolean
  method: AuthMethod
  accounts: IAccount[]
  maxUploadLimit: number
  type: UserType
  // Заполнены только после успешной проверки ИНН через DaData (см.
  // UserService.verifyBusiness на бэкенде) — businessVerifiedAt === null,
  // пока продавец не подтвердил ИП/компанию. businessName — готовое к
  // показу название ("ИП Иванов И.И." / "ООО РОМАШКА").
  businessInn?: string | null
  businessName?: string | null
  businessVerifiedAt?: string | null
  // Премиум активен, если дата в будущем — НЕ связано с полем role (см.
  // комментарий в schema.prisma на бэкенде, UserRole.Premium оставлен
  // только для обратной совместимости и новым кодом не используется).
  premiumUntil?: string | null
}

export interface IUserPhone {
  id: string
  phone: string
  isPrimary: boolean
  isVerified: boolean
  createdAt?: string
  updatedAt?: string
}

export type AuthProvider = 'google' | 'yandex'
