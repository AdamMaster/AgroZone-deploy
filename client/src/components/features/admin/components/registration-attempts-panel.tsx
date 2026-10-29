'use client'

import { Search } from 'lucide-react'

import { Button, Input } from '@/components/ui'

import { formatPhoneNumber, pluralizeRu } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { ADMIN_BUTTON_CLASS, fieldClassName, getAdminChipClassName } from '../constants/admin-ui.constants'
import {
  REGISTRATION_ATTEMPT_FILTERS,
  REGISTRATION_CHANNEL_LABELS,
  REGISTRATION_FAILURE_REASON_LABELS,
  REGISTRATION_PLATFORM_LABELS,
  REGISTRATION_STATUS_CLASSES,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STEP_LABELS
} from '../constants/registration-attempts.constants'
import { useAdminRegistrationAttempts } from '../hooks'
import { IRegistrationAttempt, RegistrationAttemptChannel, RegistrationAttemptPlatform } from '../types/admin.types'

const CHANNEL_OPTIONS: { id: RegistrationAttemptChannel | undefined; label: string }[] = [
  { id: undefined, label: 'Любой способ' },
  { id: 'PHONE', label: 'Телефон' },
  { id: 'EMAIL', label: 'Почта' }
]

const PLATFORM_OPTIONS: { id: RegistrationAttemptPlatform | undefined; label: string }[] = [
  { id: undefined, label: 'Любая платформа' },
  { id: 'SITE', label: 'Сайт' },
  { id: 'APP', label: 'Приложение' }
]

const formatDateTime = (value: string) => new Date(value).toLocaleString('ru-RU')

const formatContact = (attempt: IRegistrationAttempt) =>
  attempt.channel === 'PHONE' ? formatPhoneNumber(`+${attempt.contact}`) : attempt.contact

const renderAttempt = (attempt: IRegistrationAttempt) => (
  <div key={attempt.id} className='rounded-md bg-mist-600/50 p-3'>
    <div className='mb-1 flex flex-wrap items-center gap-2'>
      <span className='font-medium break-all'>{formatContact(attempt)}</span>
      <span className={`rounded-full px-1.5 text-[11px] ${REGISTRATION_STATUS_CLASSES[attempt.status]}`}>
        {REGISTRATION_STATUS_LABELS[attempt.status]}
      </span>
      {attempt.registeredLater && attempt.status !== 'COMPLETED' && (
        <span className='rounded-full bg-emerald-300 px-1.5 text-[11px] text-mist-950'>Зарегистрировался позже</span>
      )}
      <span className='text-xs text-mist-400'>
        {REGISTRATION_CHANNEL_LABELS[attempt.channel]} · {REGISTRATION_PLATFORM_LABELS[attempt.platform]}
      </span>
    </div>

    {attempt.failureReason && (
      <p className='text-sm text-red-300'>
        {REGISTRATION_FAILURE_REASON_LABELS[attempt.failureReason]}
        {attempt.failuresCount > 1 && ` · ошибок подряд: ${attempt.failuresCount}`}
      </p>
    )}

    {attempt.failureDetail && (
      <p className='mt-1 rounded-sm bg-mist-600/60 p-2 text-xs break-words text-mist-200'>{attempt.failureDetail}</p>
    )}

    <p className='mt-2 text-xs text-mist-300'>Дошёл до шага: {REGISTRATION_STEP_LABELS[attempt.step]}</p>

    <p className='mt-1 text-xs text-mist-400'>
      {formatDateTime(attempt.createdAt)}
      {attempt.updatedAt !== attempt.createdAt && ` · последнее действие ${formatDateTime(attempt.updatedAt)}`}
      {attempt.device && ` · ${attempt.device}`}
      {attempt.ip && ` · IP ${attempt.ip}`}
    </p>
  </div>
)

// Журнал попыток регистрации (/admin/registration-attempts): кто пытался
// зарегистрироваться, на каком шаге остановился и почему (в том числе ошибки
// сервиса звонков и почты). Заменяет разбор таблицы tokens в базе. Хранится
// 90 дней; вход через Яндекс/Google пока не пишется.
export const RegistrationAttemptsPanel = () => {
  const {
    filter,
    setFilter,
    channel,
    setChannel,
    platform,
    setPlatform,
    search,
    setSearch,
    attempts,
    total,
    summary,
    isLoading,
    isError,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch
  } = useAdminRegistrationAttempts()

  return (
    <div className='py-6 text-mist-50'>
      {summary && (
        <p className='mb-4 text-sm text-mist-300'>
          За последние {summary.days} {pluralizeRu(summary.days, ['день', 'дня', 'дней'])}: попыток {summary.total},
          завершили {summary.completed}, с проблемами {summary.problems}.
        </p>
      )}

      <div className='mb-3 flex flex-wrap gap-2'>
        {REGISTRATION_ATTEMPT_FILTERS.map(item => (
          <button
            key={item.id}
            type='button'
            className={getAdminChipClassName(filter === item.id)}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className='mb-3 flex flex-wrap gap-2'>
        {CHANNEL_OPTIONS.map(item => (
          <button
            key={item.label}
            type='button'
            className={getAdminChipClassName(channel === item.id)}
            onClick={() => setChannel(item.id)}
          >
            {item.label}
          </button>
        ))}
        {PLATFORM_OPTIONS.map(item => (
          <button
            key={item.label}
            type='button'
            className={getAdminChipClassName(platform === item.id)}
            onClick={() => setPlatform(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className='relative mb-4 max-w-md'>
        <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-400' />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Телефон или почта (часть)'
          className={cn(fieldClassName, 'pl-9')}
        />
      </div>

      {isLoading && <p className='text-sm'>Загрузка...</p>}

      {isError && (
        <div className='mb-3 flex items-center gap-3 text-sm text-red-300'>
          Не удалось загрузить журнал.
          <Button size='sm' className={ADMIN_BUTTON_CLASS} onClick={() => refetch()}>
            Повторить
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <p className='mb-3 text-xs text-mist-400'>
          {total > 0
            ? `Найдено: ${total}${isRefetching ? ' · обновляем…' : ''}`
            : filter === 'problems'
              ? 'Проблемных попыток нет.'
              : 'Ничего не найдено.'}
        </p>
      )}

      <div className='flex flex-col gap-2'>{attempts.map(renderAttempt)}</div>

      {hasNextPage && (
        <Button className={`${ADMIN_BUTTON_CLASS} mt-4`} disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'}
        </Button>
      )}
    </div>
  )
}
