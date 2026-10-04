import { cn } from '@/lib/utils'

import { formatDateTime } from '@/shared/utils'

import {
  SECURITY_EVENT_ACTOR_LABELS,
  SECURITY_EVENT_META,
  SECURITY_EVENTS_VARIANT_STYLES,
  SecurityEventsVariant,
  UNKNOWN_SECURITY_EVENT_META
} from '../constants/security-event.constants'
import { IAdminSecurityEvent, ISecurityEvent } from '../types/security-event.types'
import { describeSecurityEvent } from '../utils'

interface SecurityEventsListProps {
  events: Array<ISecurityEvent | IAdminSecurityEvent>
  variant: SecurityEventsVariant
}

// У админской записи есть поля, которых нет у пользовательской (имя
// администратора, User-Agent целиком) — различаем по ним, а не по
// отдельному пропсу, чтобы список нельзя было "включить" в админском режиме
// на данных пользователя.
const isAdminEvent = (event: ISecurityEvent | IAdminSecurityEvent): event is IAdminSecurityEvent =>
  'actorName' in event

// Кто совершил действие, если это не сам владелец аккаунта (обычное
// действие пользователя отдельной подписью не выделяем — это норма).
function getActorLabel(event: ISecurityEvent | IAdminSecurityEvent): string | null {
  if (event.actor === 'USER') {
    return null
  }

  const label = SECURITY_EVENT_ACTOR_LABELS[event.actor]

  return isAdminEvent(event) && event.actorName ? `${label} ${event.actorName}` : label
}

export const SecurityEventsList = ({ events, variant }: SecurityEventsListProps) => {
  const styles = SECURITY_EVENTS_VARIANT_STYLES[variant]

  return (
    <ul className='flex flex-col gap-2'>
      {events.map(event => {
        const meta = SECURITY_EVENT_META[event.type] ?? UNKNOWN_SECURITY_EVENT_META
        const Icon = meta.icon
        const { title, details } = describeSecurityEvent(event)
        const actorLabel = getActorLabel(event)
        const origin = [event.ip, event.device].filter(Boolean).join(' · ')

        return (
          <li key={event.id} className={cn('flex items-start gap-3 rounded-md p-3', styles.row)}>
            <span
              className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', styles.tones[meta.tone])}
            >
              <Icon className='size-4' />
            </span>

            <div className='min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
                <p className={cn('text-sm font-medium', styles.title)}>{title}</p>
                {actorLabel && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px]',
                      styles.tones[event.actor === 'ADMIN' ? 'info' : 'neutral']
                    )}
                  >
                    {actorLabel}
                  </span>
                )}
              </div>

              {details && <p className={cn('mt-0.5 text-sm break-words', styles.muted)}>{details}</p>}

              <p
                className={cn('mt-1 text-xs break-words', styles.faint)}
                title={isAdminEvent(event) && event.userAgent ? event.userAgent : undefined}
              >
                {formatDateTime(event.createdAt)}
                {origin && ` · ${origin}`}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
