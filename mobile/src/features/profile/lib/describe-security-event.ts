import { formatFullDate } from '@/shared/utils/date'

import {
  AUTH_METHOD_LABELS,
  LOGIN_METHOD_LABELS,
  ROLE_LABELS,
  SECURITY_EVENT_META,
  type SecurityEventMeta,
  UNKNOWN_SECURITY_EVENT_META
} from '../constants/security-events'
import type { SecurityEvent } from '../types/security-event.types'

export interface SecurityEventDescription {
  title: string
  // Вторая строка — что именно изменилось; null, если заголовок говорит всё.
  details: string | null
}

export const getSecurityEventMeta = (type: string): SecurityEventMeta =>
  SECURITY_EVENT_META[type] ?? UNKNOWN_SECURITY_EVENT_META

const asText = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null)

const premiumText = (value: unknown): string => {
  const date = asText(value)

  return date ? `до ${formatFullDate(date)}` : 'не активен'
}

// Заголовок и подробности записи журнала — те же формулировки, что
// describeSecurityEvent сайта. Любого поля metadata может не быть (старые
// записи, новые версии сервера), на это есть запасные формулировки.
export function describeSecurityEvent(event: SecurityEvent): SecurityEventDescription {
  const { title } = getSecurityEventMeta(event.type)
  const data = event.metadata ?? {}

  switch (event.type) {
    case 'PASSWORD_CHANGED':
      // firstPassword: у аккаунта через Яндекс пароля раньше не было — это
      // установка, а не смена.
      return { title: data.firstPassword === true ? 'Пароль установлен' : title, details: null }

    case 'ACCOUNT_REGISTERED': {
      const method = asText(data.method)

      return { title, details: method ? `Способ: ${AUTH_METHOD_LABELS[method] ?? method}` : null }
    }

    case 'ACCOUNT_CREATED_BY_ADMIN': {
      const contacts = [asText(data.phone), asText(data.email)].filter(Boolean).join(', ')

      return { title, details: contacts || null }
    }

    case 'LOGIN_NEW_DEVICE': {
      const method = asText(data.method)

      return { title, details: method ? `Способ входа: ${LOGIN_METHOD_LABELS[method] ?? method}` : null }
    }

    case 'EMAIL_CHANGE_REQUESTED': {
      const newEmail = asText(data.newEmail)

      return { title, details: newEmail ? `Новый адрес: ${newEmail}` : null }
    }

    case 'EMAIL_CHANGED':
    case 'EMAIL_SET_BY_ADMIN':
      return {
        title,
        details: `${asText(data.previousEmail) ?? 'не был указан'} → ${asText(data.newEmail) ?? '—'}`
      }

    case 'PHONE_ADDED': {
      const phone = asText(data.phone)

      return { title, details: phone ? `${phone}${data.primary === true ? ', основной' : ''}` : null }
    }

    case 'PHONE_CHANGED':
    case 'PRIMARY_PHONE_CHANGED':
      return { title, details: asText(data.phone) }

    case 'OAUTH_LINKED': {
      const provider = asText(data.provider)

      return { title, details: provider ? (AUTH_METHOD_LABELS[provider.toUpperCase()] ?? provider) : null }
    }

    case 'ROLE_CHANGED': {
      const from = asText(data.from)
      const to = asText(data.to)

      return { title, details: from && to ? `${ROLE_LABELS[from] ?? from} → ${ROLE_LABELS[to] ?? to}` : null }
    }

    case 'PREMIUM_SET_BY_ADMIN':
      return { title, details: `${premiumText(data.previousPremiumUntil)} → ${premiumText(data.premiumUntil)}` }

    default:
      return { title, details: null }
  }
}
