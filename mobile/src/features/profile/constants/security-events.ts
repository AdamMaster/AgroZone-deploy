import type { LucideIcon } from 'lucide-react-native'

import {
  Crown,
  KeyRound,
  Link2,
  LogIn,
  Mail,
  MailCheck,
  Phone,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  UserCog,
  UserPlus,
  UserX
} from '@/shared/icons/lucide'

// Насколько событие заслуживает внимания: danger — частые следы взлома или
// необратимое (отключили защиту, удалили аккаунт), warning — меняет доступ
// к аккаунту, info — действие администратора, neutral — обычная история.
// Те же значения, что SECURITY_EVENT_META сайта.
export type SecurityEventTone = 'neutral' | 'info' | 'warning' | 'danger'

export interface SecurityEventMeta {
  title: string
  icon: LucideIcon
  tone: SecurityEventTone
}

export const SECURITY_EVENT_META: Readonly<Record<string, SecurityEventMeta>> = {
  ACCOUNT_REGISTERED: { title: 'Регистрация аккаунта', icon: UserPlus, tone: 'neutral' },
  ACCOUNT_CREATED_BY_ADMIN: { title: 'Аккаунт создан администратором', icon: UserPlus, tone: 'info' },
  ACCOUNT_DELETED: { title: 'Аккаунт удалён', icon: UserX, tone: 'danger' },
  LOGIN_NEW_DEVICE: { title: 'Вход с нового устройства или IP', icon: LogIn, tone: 'warning' },
  PASSWORD_CHANGED: { title: 'Пароль изменён', icon: KeyRound, tone: 'warning' },
  PASSWORD_RESET: { title: 'Пароль сброшен по ссылке из письма', icon: KeyRound, tone: 'warning' },
  PASSWORD_SET_BY_ADMIN: { title: 'Пароль задан администратором', icon: KeyRound, tone: 'info' },
  EMAIL_CHANGE_REQUESTED: { title: 'Запрошена смена email', icon: Mail, tone: 'warning' },
  EMAIL_CHANGED: { title: 'Email изменён', icon: MailCheck, tone: 'warning' },
  EMAIL_SET_BY_ADMIN: { title: 'Email задан администратором', icon: Mail, tone: 'info' },
  PHONE_ADDED: { title: 'Добавлен телефон', icon: Smartphone, tone: 'neutral' },
  PHONE_CHANGED: { title: 'Телефон изменён', icon: Phone, tone: 'warning' },
  PRIMARY_PHONE_CHANGED: { title: 'Основной телефон изменён', icon: Phone, tone: 'warning' },
  TWO_FACTOR_ENABLED: { title: 'Двухфакторная защита включена', icon: ShieldCheck, tone: 'neutral' },
  TWO_FACTOR_DISABLED: { title: 'Двухфакторная защита отключена', icon: ShieldOff, tone: 'danger' },
  OAUTH_LINKED: { title: 'Привязан вход через соцсеть', icon: Link2, tone: 'warning' },
  ROLE_CHANGED: { title: 'Изменена роль аккаунта', icon: UserCog, tone: 'danger' },
  PREMIUM_SET_BY_ADMIN: { title: 'Premium изменён администратором', icon: Crown, tone: 'info' }
}

// Тип, которого эта версия приложения ещё не знает (сервер обновился
// раньше) — запись всё равно видна, а не пропадает.
export const UNKNOWN_SECURITY_EVENT_META: SecurityEventMeta = {
  title: 'Событие безопасности',
  icon: ShieldCheck,
  tone: 'neutral'
}

export const SECURITY_EVENT_ACTOR_LABELS = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
  SYSTEM: 'Система'
} as const

// Фильтры над журналом; без types — все события. Каждый тип входит ровно в
// одну группу.
export interface SecurityEventGroup {
  id: string
  label: string
  types?: readonly string[]
}

export const SECURITY_EVENT_GROUPS: readonly SecurityEventGroup[] = [
  { id: 'all', label: 'Все' },
  { id: 'password', label: 'Пароль', types: ['PASSWORD_CHANGED', 'PASSWORD_RESET', 'PASSWORD_SET_BY_ADMIN'] },
  { id: 'email', label: 'Email', types: ['EMAIL_CHANGE_REQUESTED', 'EMAIL_CHANGED', 'EMAIL_SET_BY_ADMIN'] },
  { id: 'phone', label: 'Телефон', types: ['PHONE_ADDED', 'PHONE_CHANGED', 'PRIMARY_PHONE_CHANGED'] },
  {
    id: 'access',
    label: 'Вход и защита',
    types: ['LOGIN_NEW_DEVICE', 'OAUTH_LINKED', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED']
  },
  {
    id: 'account',
    label: 'Аккаунт',
    types: ['ACCOUNT_REGISTERED', 'ACCOUNT_CREATED_BY_ADMIN', 'ACCOUNT_DELETED', 'ROLE_CHANGED', 'PREMIUM_SET_BY_ADMIN']
  }
]

export const LOGIN_METHOD_LABELS: Readonly<Record<string, string>> = {
  password: 'пароль',
  sms: 'подтверждение звонком',
  oauth: 'соцсеть',
  email: 'ссылка из письма'
}

export const AUTH_METHOD_LABELS: Readonly<Record<string, string>> = {
  CREDENTIALS: 'Телефон + пароль',
  GOOGLE: 'Google',
  YANDEX: 'Яндекс'
}

export const ROLE_LABELS: Readonly<Record<string, string>> = {
  REGULAR: 'Пользователь',
  PREMIUM: 'Premium',
  ADMIN: 'Администратор'
}

// Цвета значка по тону — как светлый вариант журнала на сайте. Цвет
// иконки задаётся пропсом, поэтому он здесь значением, а не классом: в
// тёмной теме — светлый оттенок того же цвета (как в журнале админки).
export const SECURITY_EVENT_TONE_STYLES: Readonly<
  Record<SecurityEventTone, { container: string; iconColor: { light: string; dark: string } }>
> = {
  neutral: { container: 'bg-gray-100', iconColor: { light: '#4a5565', dark: '#d4d4d4' } },
  info: { container: 'bg-sky-50 dark:bg-sky-500/20', iconColor: { light: '#0069a8', dark: '#74d4ff' } },
  warning: { container: 'bg-amber-50 dark:bg-amber-500/20', iconColor: { light: '#bb4d00', dark: '#ffd236' } },
  danger: { container: 'bg-red-50 dark:bg-red-500/20', iconColor: { light: '#c10007', dark: '#ffa2a2' } }
}
