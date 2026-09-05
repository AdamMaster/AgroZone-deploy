'use client'

import { useAppModal } from '@/store'
import { Heart, Layers, Lock, Plus } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import React, { PropsWithChildren, useEffect } from 'react'

import { NotificationBell } from '@/components/features/notifications/components'
import { UserButton } from '@/components/features/user/components'

import { useMounted, useProfile } from '@/shared/hooks'

import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export const HeaderActions: React.FC<Props> = ({ className }) => {
  const { onOpen } = useAppModal()
  const { user, isLoading } = useProfile()

  // Профиль приходит клиентским запросом (см. useProfile), на сервере его нет
  // в принципе — и до этого флага компонент рисовал гостю кнопки «Вход и
  // регистрация», а авторизованному ссылки «Разместить объявление» / «Мои
  // объявления». Разметка получалась разной, и React ругался на несовпадение
  // гидратации: в HTML с сервера лежал <button>, а клиент строил <a>.
  //
  // Само по себе отсутствие профиля на сервере проблемой не было бы — при
  // первом клиентском рендере запрос обычно ещё не завершён, и обе стороны
  // сходятся на гостевом варианте. Ломает то, что Header завёрнут в <Suspense>
  // (см. MainLayout): гидратация этого куска откладывается, и к моменту, когда
  // до него доходит очередь, профиль уже успевает вернуться.
  //
  // Поэтому первый клиентский рендер делаем заведомо совпадающим с серверным:
  // до монтирования и пока профиль грузится — нейтральное место, и только
  // потом настоящие кнопки. Побочная польза: авторизованный больше не видит
  // мигание чужого «Вход и регистрация» перед своими кнопками.
  //
  // useMounted (см. shared/hooks) — на useSyncExternalStore, а не на паре
  // useState + useEffect: синхронный setState в теле эффекта запрещён
  // линтером проекта и вызывает лишний каскад рендеров.
  const isMounted = useMounted()

  const searchParams = useSearchParams()

  useEffect(() => {
    const auth = searchParams.get('auth')
    const reason = searchParams.get('reason')

    if (auth === 'true') {
      if (reason === 'reset') {
        onOpen('login-after-reset')
      } else {
        onOpen('login')
      }
    }
  }, [searchParams])

  // Высоту держит контейнер шапки (flex h-14), так что пустое место здесь не
  // двигает вёрстку по вертикали; скелетон не рисуем намеренно — мельтешение
  // серых плашек в шапке на доли секунды заметнее, чем пустота.
  if (!isMounted || isLoading) {
    return <div className={cn('flex items-center', className)} />
  }

  return (
    <>
      {!user ? (
        <div className={cn('flex items-center', className)}>
          <ActionButton onClick={() => onOpen()}>
            <Lock className='h-4 w-4' />
            Вход и регистрация
          </ActionButton>
          <ActionButton onClick={() => onOpen()}>
            <Plus className='h-4 w-4' />
            Разместить объявление
          </ActionButton>
        </div>
      ) : (
        <div className={cn('flex items-center', className)}>
          <ActionButton isLink={true} href='/ads/create'>
            <Plus className='h-4 w-4' />
            Разместить объявление
          </ActionButton>
          <ActionButton isLink={true} href='/profile/settings/ads'>
            <Layers className='h-4 w-4' />
            Мои объявления
          </ActionButton>
          <Link href='/profile/settings/favorites' className='px-2 py-1'>
            <Heart className='size-6 fill-gray-300 text-gray-300 hover:fill-gray-400 hover:text-gray-400' />
          </Link>
          <NotificationBell />
          <UserButton className='ml-2' user={user} />
        </div>
      )}
    </>
  )
}

interface ActionButtonProps {
  isLink?: boolean
  href?: string
  onClick?: () => void
}
const ActionButton = ({ children, isLink = false, href, onClick }: PropsWithChildren<ActionButtonProps>) => {
  if (isLink) {
    return (
      <Link
        href={href!}
        className='hover:text-primary flex items-center gap-1.5 px-3 py-1 text-sm text-gray-900 transition-colors duration-200'
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      className='hover:text-primary flex items-center gap-1.5 px-3 py-1 text-sm text-gray-900 transition-colors duration-200'
      onClick={onClick}
    >
      {children}
    </button>
  )
}
