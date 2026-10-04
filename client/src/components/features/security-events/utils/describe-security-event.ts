import { AUTH_METHOD_LABELS } from '@/shared/constants/auth-method-labels'
import { formatFullDate } from '@/shared/utils'

import {
  LOGIN_METHOD_LABELS,
  ROLE_LABELS,
  SECURITY_EVENT_META,
  UNKNOWN_SECURITY_EVENT_META
} from '../constants/security-event.constants'
import { ISecurityEvent } from '../types/security-event.types'

export interface SecurityEventDescription {
  title: string
  // Вторая строка с подробностями (что именно изменилось) — null, если
  // событие само по себе всё сказало.
  details: string | null
}

const asText = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null)

const premiumText = (value: unknown): string => {
  const date = asText(value)

  return date ? `до ${formatFullDate(date)}` : 'не активен'
}

// Превращает запись журнала в заголовок и подробности для показа. Контакты
// в metadata уже маскированы на сервере — здесь они выводятся как есть.
// Любое поле metadata может отсутствовать (старые записи, будущие версии
// сервера), поэтому ничего не предполагается и на пропуски есть запасные
// формулировки.
export function describeSecurityEvent(event: ISecurityEvent): SecurityEventDescription {
  const meta = SECURITY_EVENT_META[event.type] ?? UNKNOWN_SECURITY_EVENT_META
  const data = event.metadata ?? {}

  switch (event.type) {
    case 'PASSWORD_CHANGED':
      return {
        // firstPassword: у аккаунта (например, созданного через Яндекс)
        // пароля раньше не было — это установка, а не смена.
        title: data.firstPassword === true ? 'Пароль установлен' : meta.title,
        details: null
      }

    case 'ACCOUNT_REGISTERED': {
      const method = asText(data.method)

      return { title: meta.title, details: method ? `Способ: ${AUTH_METHOD_LABELS[method] ?? method}` : null }
    }

    case 'ACCOUNT_CREATED_BY_ADMIN': {
      const contacts = [asText(data.phone), asText(data.email)].filter(Boolean).join(', ')

      return { title: meta.title, details: contacts || null }
    }

    case 'LOGIN_NEW_DEVICE': {
      const method = asText(data.method)

      return { title: meta.title, details: method ? `Способ входа: ${LOGIN_METHOD_LABELS[method] ?? method}` : null }
    }

    case 'EMAIL_CHANGE_REQUESTED': {
      const newEmail = asText(data.newEmail)

      return { title: meta.title, details: newEmail ? `Новый адрес: ${newEmail}` : null }
    }

    case 'EMAIL_CHANGED':
    case 'EMAIL_SET_BY_ADMIN':
      return {
        title: meta.title,
        details: `${asText(data.previousEmail) ?? 'не был указан'} → ${asText(data.newEmail) ?? '—'}`
      }

    case 'PHONE_ADDED': {
      const phone = asText(data.phone)

      return { title: meta.title, details: phone ? `${phone}${data.primary === true ? ', основной' : ''}` : null }
    }

    case 'PHONE_CHANGED':
    case 'PRIMARY_PHONE_CHANGED':
      return { title: meta.title, details: asText(data.phone) }

    case 'OAUTH_LINKED': {
      const provider = asText(data.provider)

      return { title: meta.title, details: provider ? (AUTH_METHOD_LABELS[provider.toUpperCase()] ?? provider) : null }
    }

    case 'ROLE_CHANGED': {
      const from = asText(data.from)
      const to = asText(data.to)

      return {
        title: meta.title,
        details: from && to ? `${ROLE_LABELS[from] ?? from} → ${ROLE_LABELS[to] ?? to}` : null
      }
    }

    case 'PREMIUM_SET_BY_ADMIN':
      return {
        title: meta.title,
        details: `${premiumText(data.previousPremiumUntil)} → ${premiumText(data.premiumUntil)}`
      }

    default:
      return { title: meta.title, details: null }
  }
}
