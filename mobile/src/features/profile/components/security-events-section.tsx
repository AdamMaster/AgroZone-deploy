import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useUniwind } from 'uniwind'

import { Button } from '@/shared/components/button'
import { formatDateTime } from '@/shared/utils/date'
import { pluralizeRu } from '@/shared/utils/pluralize'

import {
  SECURITY_EVENT_ACTOR_LABELS,
  SECURITY_EVENT_GROUPS,
  SECURITY_EVENT_TONE_STYLES,
  type SecurityEventGroup
} from '../constants/security-events'
import { useSecurityEvents } from '../hooks/use-security-events'
import { describeSecurityEvent, getSecurityEventMeta } from '../lib/describe-security-event'
import type { SecurityEvent } from '../types/security-event.types'

function SecurityEventRow({ event }: { event: SecurityEvent }) {
  const { theme } = useUniwind()
  const meta = getSecurityEventMeta(event.type)
  const tone = SECURITY_EVENT_TONE_STYLES[meta.tone]
  const Icon = meta.icon
  const { title, details } = describeSecurityEvent(event)
  const origin = [event.ip, event.device].filter(Boolean).join(' · ')
  // Обычное действие самого владельца отдельной подписью не выделяем.
  const actorLabel = event.actor === 'USER' ? null : SECURITY_EVENT_ACTOR_LABELS[event.actor]
  const actorTone = SECURITY_EVENT_TONE_STYLES[event.actor === 'ADMIN' ? 'info' : 'neutral']

  return (
    <View className='flex-row items-start gap-3 rounded-md border border-border bg-white p-3 dark:bg-gray-50'>
      <View className={`mt-0.5 size-8 items-center justify-center rounded-full ${tone.container}`}>
        <Icon size={16} color={theme === 'dark' ? tone.iconColor.dark : tone.iconColor.light} />
      </View>

      <View className='min-w-0 flex-1'>
        <View className='flex-row flex-wrap items-center gap-x-2 gap-y-0.5'>
          <Text className='text-sm font-medium text-gray-900'>{title}</Text>
          {actorLabel && (
            <View className={`rounded-full px-2 py-0.5 ${actorTone.container}`}>
              <Text
                className='text-[11px]'
                style={{ color: theme === 'dark' ? actorTone.iconColor.dark : actorTone.iconColor.light }}
              >
                {actorLabel}
              </Text>
            </View>
          )}
        </View>
        {details && <Text className='mt-0.5 text-sm text-gray-600'>{details}</Text>}
        <Text className='mt-1 text-xs text-gray-400'>
          {formatDateTime(event.createdAt)}
          {origin && ` · ${origin}`}
        </Text>
      </View>
    </View>
  )
}

// «Недавняя активность» — журнал безопасности с фильтрами, как
// MySecurityEvents сайта: пользователь видит, что и откуда менялось в
// аккаунте, и может заметить чужие действия.
export function SecurityEventsSection() {
  const [group, setGroup] = useState<SecurityEventGroup>(SECURITY_EVENT_GROUPS[0])
  const { events, total, isPending, isError, isRefreshing, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useSecurityEvents(group)

  return (
    <View>
      <View accessibilityRole='radiogroup' accessibilityLabel='Фильтр событий' className='flex-row flex-wrap gap-1'>
        {SECURITY_EVENT_GROUPS.map(item => {
          const isActive = item.id === group.id

          return (
            <Pressable
              key={item.id}
              accessibilityRole='radio'
              accessibilityState={{ checked: isActive }}
              onPress={() => setGroup(item)}
              className={`rounded-full border px-3 py-1 ${
                isActive ? 'border-gray-900 bg-gray-900' : 'border-gray-200 bg-white active:bg-gray-50 dark:bg-gray-50'
              }`}
            >
              <Text className={`text-sm ${isActive ? 'text-white dark:text-gray-50' : 'text-gray-700'}`}>
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {isPending && (
        <View className='mt-3 items-start'>
          <ActivityIndicator colorClassName='accent-gray-500' />
        </View>
      )}

      {isError && (
        <View className='mt-3 items-start gap-2'>
          <Text className='text-sm text-red-500'>Не удалось загрузить журнал событий.</Text>
          <Button title='Повторить' variant='outline' size='sm' onPress={() => void refetch()} />
        </View>
      )}

      {!isPending && !isError && events.length === 0 && (
        <Text className='mt-3 text-sm text-gray-600'>Событий пока нет.</Text>
      )}

      {events.length > 0 && (
        <View className={`mt-3 ${isRefreshing ? 'opacity-60' : ''}`}>
          <Text className='mb-2 text-xs text-gray-400'>
            {total} {pluralizeRu(total, ['событие', 'события', 'событий'])}
          </Text>

          <View className='gap-2'>
            {events.map(event => (
              <SecurityEventRow key={event.id} event={event} />
            ))}
          </View>

          {hasNextPage && (
            <View className='mt-4 items-center'>
              <Pressable
                accessibilityRole='button'
                disabled={isFetchingNextPage}
                onPress={() => void fetchNextPage()}
                className='rounded-lg px-3 py-2 active:bg-gray-100 disabled:opacity-50'
              >
                <Text className='text-sm font-medium text-gray-900'>
                  {isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
