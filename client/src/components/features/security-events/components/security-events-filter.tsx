import { SECURITY_EVENT_GROUPS, SecurityEventGroup } from '../constants/security-event.constants'

interface SecurityEventsFilterProps {
  activeGroupId: string
  onChange: (group: SecurityEventGroup) => void
  // Классы чипа отдаёт вызывающий код: в админке (тёмная тема) и в
  // настройках пользователя (светлая) они разные, а сама разметка и логика
  // фильтра общие.
  getChipClassName: (isActive: boolean) => string
}

export const SecurityEventsFilter = ({ activeGroupId, onChange, getChipClassName }: SecurityEventsFilterProps) => {
  return (
    <div className='flex flex-wrap gap-1' role='group' aria-label='Фильтр событий'>
      {SECURITY_EVENT_GROUPS.map(group => {
        const isActive = group.id === activeGroupId

        return (
          <button
            key={group.id}
            type='button'
            aria-pressed={isActive}
            className={getChipClassName(isActive)}
            onClick={() => onChange(group)}
          >
            {group.label}
          </button>
        )
      })}
    </div>
  )
}
