import {
  Crown,
  KeyRound,
  Link2,
  LogIn,
  LucideIcon,
  Mail,
  MailCheck,
  Phone,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  UserCog,
  UserPlus,
  UserX
} from 'lucide-react'

import { SecurityEventActor, SecurityEventType } from '../types/security-event.types'

// Насколько событие заслуживает внимания при просмотре журнала: danger —
// то, что чаще всего является следами взлома или необратимо (отключили
// защиту, удалили аккаунт, выдали роль), warning — меняет доступ к аккаунту,
// info — действие администратора/нейтральное сопровождение, neutral —
// обычная история.
export type SecurityEventTone = 'neutral' | 'info' | 'warning' | 'danger'

export interface SecurityEventMeta {
  title: string
  icon: LucideIcon
  tone: SecurityEventTone
}

export const SECURITY_EVENT_META: Record<SecurityEventType, SecurityEventMeta> = {
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

// Запасной вариант на случай типа, которого этот клиент ещё не знает
// (сервер задеплоен новее фронта) — запись всё равно видна, а не пропадает.
export const UNKNOWN_SECURITY_EVENT_META: SecurityEventMeta = {
  title: 'Событие безопасности',
  icon: ShieldCheck,
  tone: 'neutral'
}

export const SECURITY_EVENT_ACTOR_LABELS: Record<SecurityEventActor, string> = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
  SYSTEM: 'Система'
}

// Группы-фильтры над журналом. types: undefined — без фильтра (все события).
// Каждый тип должен входить ровно в одну группу — иначе событие нельзя
// будет найти ни одним фильтром, кроме "Все".
export interface SecurityEventGroup {
  id: string
  label: string
  types?: SecurityEventType[]
}

export const SECURITY_EVENT_GROUPS: SecurityEventGroup[] = [
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

export const LOGIN_METHOD_LABELS: Record<string, string> = {
  password: 'пароль',
  sms: 'подтверждение звонком',
  oauth: 'соцсеть',
  email: 'ссылка из письма'
}

export const ROLE_LABELS: Record<string, string> = {
  REGULAR: 'Пользователь',
  PREMIUM: 'Premium',
  ADMIN: 'Администратор'
}

// Цвета по тону — в двух темах: админка тёмная (mist), настройки
// пользователя светлые. Одна карта вместо двух разрозненных наборов
// классов внутри компонента.
export type SecurityEventsVariant = 'dark' | 'light'

export interface SecurityEventsVariantStyles {
  row: string
  title: string
  muted: string
  faint: string
  tones: Record<SecurityEventTone, string>
}

export const SECURITY_EVENTS_VARIANT_STYLES: Record<SecurityEventsVariant, SecurityEventsVariantStyles> = {
  dark: {
    row: 'bg-mist-700/30',
    title: 'text-mist-50',
    muted: 'text-mist-300',
    faint: 'text-mist-400',
    tones: {
      neutral: 'bg-mist-500/30 text-mist-200',
      info: 'bg-sky-500/20 text-sky-300',
      warning: 'bg-amber-500/20 text-amber-300',
      danger: 'bg-red-500/20 text-red-300'
    }
  },
  light: {
    row: 'border bg-white',
    title: 'text-gray-900',
    muted: 'text-gray-600',
    faint: 'text-gray-400',
    tones: {
      neutral: 'bg-gray-100 text-gray-600',
      info: 'bg-sky-50 text-sky-700',
      warning: 'bg-amber-50 text-amber-700',
      danger: 'bg-red-50 text-red-700'
    }
  }
}
