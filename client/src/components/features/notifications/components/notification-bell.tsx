'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationsCount
} from '../hooks'
import { INotification } from '../types/notification.types'
import { formatNotificationDate } from '../utils'

export const NotificationBell = () => {
  const router = useRouter()
  const { notifications, isLoadingNotifications } = useNotifications()
  const { unreadCount } = useUnreadNotificationsCount()
  const { markAsRead } = useMarkNotificationAsRead()
  const { markAllAsRead, isMarkingAllAsRead } = useMarkAllNotificationsAsRead()

  // Клик по уведомлению одновременно помечает его прочитанным и, если есть
  // link (например /ads/{id}/edit для отклонённого объявления), сразу
  // ведёт туда — двух отдельных действий пользователю не нужно.
  const handleSelect = (notification: INotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='relative px-2 py-1'>
        <Bell className='size-6 fill-gray-300 text-gray-300 hover:fill-gray-400 hover:text-gray-400' />
        {unreadCount > 0 && (
          <span className='bg-primary absolute top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white'>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent className='w-80' align='end'>
        {unreadCount > 0 && (
          <div className='flex items-center justify-between px-1.5 py-1'>
            <button
              type='button'
              disabled={isMarkingAllAsRead}
              onClick={() => markAllAsRead()}
              className='hover:text-primary text-xs text-gray-500 transition-colors disabled:opacity-50'
            >
              Прочитать все
            </button>
          </div>
        )}

        {isLoadingNotifications ? (
          <p className='px-1.5 py-4 text-center text-sm text-gray-500'>Загрузка...</p>
        ) : notifications.length === 0 ? (
          <p className='px-1.5 py-4 text-center text-sm text-gray-500'>Пока нет уведомлений</p>
        ) : (
          notifications.map(notification => (
            <DropdownMenuItem
              key={notification.id}
              onClick={() => handleSelect(notification)}
              className='flex-col items-start gap-0.5 py-2 whitespace-normal'
            >
              <div className='flex w-full items-center gap-1.5'>
                {!notification.isRead && <span className='bg-primary size-1.5 shrink-0 rounded-full' />}
                <p className='text-sm font-medium'>{notification.title}</p>
              </div>
              <p className='line-clamp-2 text-xs text-gray-500'>{notification.message}</p>
              <p className='text-[11px] text-gray-400'>{formatNotificationDate(notification.createdAt)}</p>
            </DropdownMenuItem>
          ))
        )}

        <Link
          href='/profile/settings/notifications'
          className='block rounded-md bg-gray-50 py-2 text-center text-xs text-gray-600 transition-colors hover:bg-gray-100'
        >
          Смотреть все
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
