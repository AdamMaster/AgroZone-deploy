'use client'

import Link from 'next/link'

import { Field, FieldDescription, Heading, Label, Skeleton, Switch } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { cn } from '@/lib/utils'

import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications } from '../../notifications/hooks'
import { INotification } from '../../notifications/types/notification.types'
import { formatNotificationDate } from '../../notifications/utils'
import { useChatEmailNotificationsMutation } from '../hooks/use-chat-email-notifications-mutation'

const NOTIFICATIONS_LIMIT = 50

const ITEM_CLASS_NAME = 'flex flex-col gap-1 rounded-xl p-4 text-left  hover:bg-gray-50'

// Письма о новых сообщениях в чате: приходят, только если сообщение осталось
// непрочитанным (через полчаса). Служебные письма (пароль, подтверждение
// почты, решения модерации) этим переключателем не отключаются.
const ChatEmailNotificationsSetting = () => {
  const { user, isLoading } = useProfile()
  const { setChatEmailNotifications, isChatEmailNotificationsLoading } = useChatEmailNotificationsMutation()

  if (isLoading) {
    return <Skeleton className='rounded-1 mb-8 h-17 w-full' />
  }

  // Без почты письма слать некуда — переключатель не имеет смысла.
  if (!user?.email) return null

  return (
    <Field className='group mb-8 rounded-lg border bg-gray-50 px-4 py-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='space-y-0.5'>
          <Label>Письма о новых сообщениях</Label>
          <FieldDescription>
            Присылать на почту, если вы не прочитали сообщение в чате в течение получаса. Письма о безопасности и
            модерации приходят всегда.
          </FieldDescription>
        </div>
        <Switch
          checked={user.chatEmailNotifications ?? true}
          onCheckedChange={checked => setChatEmailNotifications(checked)}
          disabled={isChatEmailNotificationsLoading}
        />
      </div>
    </Field>
  )
}

export const ContentNotifications = () => {
  const { notifications, isLoadingNotifications } = useNotifications({ limit: NOTIFICATIONS_LIMIT })
  const { markAsRead } = useMarkNotificationAsRead()
  const { markAllAsRead, isMarkingAllAsRead } = useMarkAllNotificationsAsRead()

  const unreadCount = notifications.filter(notification => !notification.isRead).length

  const handleSelect = (notification: INotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
  }

  if (isLoadingNotifications) {
    return (
      <div className='max-w-[800px]'>
        <Heading level={2} className='mb-8'>
          Уведомления
        </Heading>
        <ChatEmailNotificationsSetting />
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-20 w-full rounded-xl' />
          <Skeleton className='h-20 w-full rounded-xl' />
          <Skeleton className='h-20 w-full rounded-xl' />
        </div>
      </div>
    )
  }

  return (
    <div className='max-w-[800px]'>
      <div className='mb-6 flex items-center justify-between'>
        <Heading level={2}>Уведомления</Heading>
        {unreadCount > 0 && (
          <button
            type='button'
            disabled={isMarkingAllAsRead}
            onClick={() => markAllAsRead()}
            className='hover:text-primary text-sm text-gray-500 transition-colors disabled:opacity-50'
          >
            Прочитать все
          </button>
        )}
      </div>

      <ChatEmailNotificationsSetting />

      {notifications.length === 0 ? (
        <div>
          <Heading level={3} className='mb-2'>
            Пока нет уведомлений
          </Heading>
          <p className='text-[15px] leading-[1.4] text-gray-600'>
            Здесь будут появляться важные события по вашим объявлениям — например, если модератор отклонит объявление и
            укажет причину.
          </p>
        </div>
      ) : (
        <div className='-ml-[16px] flex flex-col gap-2'>
          {notifications.map(notification => {
            const content = (
              <>
                <div className='flex items-center gap-1.5'>
                  {!notification.isRead && <span className='bg-primary size-1.5 shrink-0 rounded-full' />}
                  <p className='font-medium'>{notification.title}</p>
                </div>
                <p className='text-sm text-gray-600'>{notification.message}</p>
                <p className='mt-1 text-xs text-gray-400'>{formatNotificationDate(notification.createdAt)}</p>
              </>
            )

            return notification.link ? (
              <Link
                key={notification.id}
                href={notification.link}
                onClick={() => handleSelect(notification)}
                className={cn(ITEM_CLASS_NAME, !notification.isRead && 'bg-gray-50')}
              >
                {content}
              </Link>
            ) : (
              <button
                key={notification.id}
                type='button'
                onClick={() => handleSelect(notification)}
                className={cn(ITEM_CLASS_NAME, !notification.isRead && 'bg-gray-50')}
              >
                {content}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
