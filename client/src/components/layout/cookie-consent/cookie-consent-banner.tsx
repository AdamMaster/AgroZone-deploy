'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui'

import { useMounted } from '@/shared/hooks'

import { COOKIE_CONSENT_TTL_MS, useCookieConsentStore } from '@/store'

export const CookieConsentBanner = () => {
  const { status, decidedAt, accept, decline, reset } = useCookieConsentStore()

  // Значение из persist (localStorage) появляется только после гидратации
  // на клиенте. До этого момента store.status ещё равен дефолтному null и
  // на сервере, и на клиенте при первом рендере — если рендерить баннер
  // сразу по условию status === null, он на долю секунды мигал бы даже у
  // тех, кто уже сделал выбор раньше. Поэтому ждём монтирования.
  const mounted = useMounted()

  // B4 в ROADMAP.md: выбор действителен год. Если он истёк — сбрасываем,
  // баннер на следующем рендере покажется снова.
  useEffect(() => {
    if (mounted && status !== null && decidedAt !== null && Date.now() - decidedAt > COOKIE_CONSENT_TTL_MS) {
      reset()
    }
  }, [mounted, status, decidedAt, reset])

  if (!mounted || status !== null) {
    return null
  }

  return (
    // На мобилке отступ снизу — полная высота нижней таб-панели
    // (MobileTabBar: h-14 + собственный pb-[env(safe-area-inset-bottom)]
    // под чёлку/индикатор), а не просто h-14 — иначе на iPhone с
    // safe-area-inset баннер перекрывал верх таб-панели. На md+ панели
    // нет, баннер прижат к самому низу.
    <div className='bg-background fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 border-t p-3 shadow-lg md:bottom-0'>
      <div className='mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between'>
        <p className='text-xs text-gray-600 sm:text-sm'>
          Мы используем cookie для корректной работы сайта и авторизации. Продолжая пользоваться сайтом, вы соглашаетесь
          с их использованием — подробнее в{' '}
          <Link href='/privacy' className='text-primary underline'>
            политике конфиденциальности
          </Link>
          .
        </p>
        <div className='flex shrink-0 gap-2'>
          <Button variant='outline' size='sm' onClick={decline}>
            Отклонить
          </Button>
          <Button variant='secondary' size='sm' onClick={accept}>
            Принять
          </Button>
        </div>
      </div>
    </div>
  )
}
