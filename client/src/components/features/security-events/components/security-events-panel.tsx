import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { pluralizeRu } from '@/shared/utils'

import { SECURITY_EVENTS_VARIANT_STYLES, SecurityEventGroup, SecurityEventsVariant } from '../constants/security-event.constants'
import { IAdminSecurityEvent, ISecurityEvent } from '../types/security-event.types'
import { SecurityEventsFilter } from './security-events-filter'
import { SecurityEventsList } from './security-events-list'

interface SecurityEventsPanelProps {
  variant: SecurityEventsVariant
  events: Array<ISecurityEvent | IAdminSecurityEvent>
  total: number
  isLoading: boolean
  isError: boolean
  isRefreshing: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  activeGroupId: string
  onGroupChange: (group: SecurityEventGroup) => void
  getChipClassName: (isActive: boolean) => string
  // Кнопка "Показать ещё" — стилизуется вызывающим кодом под свою тему.
  renderLoadMore: (props: { onClick: () => void; disabled: boolean; label: string }) => ReactNode
  emptyText: string
}

// Содержимое журнала: фильтр, список, состояния загрузки/ошибки/пусто и
// "Показать ещё". Общее для админки и для пользователя — они различаются
// только темой, источником данных и подписью пустого состояния, поэтому
// данные приходят пропсами, а не внутри.
export const SecurityEventsPanel = ({
  variant,
  events,
  total,
  isLoading,
  isError,
  isRefreshing,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  activeGroupId,
  onGroupChange,
  getChipClassName,
  renderLoadMore,
  emptyText
}: SecurityEventsPanelProps) => {
  const styles = SECURITY_EVENTS_VARIANT_STYLES[variant]

  return (
    <div>
      <SecurityEventsFilter activeGroupId={activeGroupId} onChange={onGroupChange} getChipClassName={getChipClassName} />

      {isLoading && <p className={cn('mt-3 text-sm', styles.muted)}>Загрузка...</p>}

      {isError && !isLoading && <p className='mt-3 text-sm text-red-500'>Не удалось загрузить журнал событий.</p>}

      {!isLoading && !isError && events.length === 0 && (
        <p className={cn('mt-3 text-sm', styles.muted)}>{emptyText}</p>
      )}

      {events.length > 0 && (
        <div className={cn('mt-3 transition-opacity', isRefreshing && 'opacity-60')}>
          <p className={cn('mb-2 text-xs', styles.faint)}>
            {total} {pluralizeRu(total, ['событие', 'события', 'событий'])}
          </p>

          <SecurityEventsList events={events} variant={variant} />

          {hasNextPage && (
            <div className='mt-4 flex justify-center'>
              {renderLoadMore({
                onClick: onLoadMore,
                disabled: isFetchingNextPage,
                label: isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
