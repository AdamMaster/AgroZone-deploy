'use client'

import { Smartphone } from 'lucide-react'
import Image from 'next/image'
import { PropsWithChildren } from 'react'

import { useSiteFlags } from '@/components/features/site-settings/hooks/use-site-flags'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { useMounted } from '@/shared/hooks'
import { METRIKA_GOALS, isTouchDevice, reachGoal } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { RUSTORE_APP_QR_SRC, RUSTORE_APP_URL } from '../constants'

export type AppDownloadPlace = 'header' | 'footer' | 'banner' | 'menu' | 'help' | 'ad-created'

interface Props {
  // Откуда нажали — уходит параметром в цель Метрики, чтобы видеть, какое из
  // мест работает.
  place: AppDownloadPlace
  // Сторона, с которой раскрывается окно с QR (в подвале — вверх).
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  className?: string
}

export const trackAppDownloadClick = (place: AppDownloadPlace) => reachGoal(METRIKA_GOALS.APP_DOWNLOAD_CLICK, { place })

// «Скачать приложение» для компьютера и планшета. На устройстве с мышью по
// наведению раскрывается окно с QR-кодом: его сканируют телефоном и
// попадают прямо в RuStore; клик по самой надписи открывает RuStore в новой
// вкладке. На сенсорном экране QR бесполезен (камера и так в этом же
// устройстве), поэтому там просто ссылка на магазин.
export const AppDownloadLink = ({
  place,
  side = 'bottom',
  align = 'center',
  className,
  children = 'Скачать приложение'
}: PropsWithChildren<Props>) => {
  // До монтирования вид у всех одинаковый — окно с QR; на сенсорных устройствах
  // после гидратации оно заменяется ссылкой. Так разметка сервера и первого
  // клиентского рендера совпадает.
  const mounted = useMounted()
  // Флаг выключен — ссылки нет вовсе (см. SiteFlagKey.AppDownload на сервере).
  const { appDownload } = useSiteFlags()
  const triggerClassName = cn(
    'hover:text-primary flex cursor-pointer items-center gap-1.5 text-sm transition-colors duration-200',
    className
  )

  if (!appDownload) {
    return null
  }

  if (mounted && isTouchDevice()) {
    return (
      <a
        href={RUSTORE_APP_URL}
        target='_blank'
        rel='noopener noreferrer'
        onClick={() => trackAppDownloadClick(place)}
        className={triggerClassName}
      >
        <Smartphone className='size-4' />
        {children}
      </a>
    )
  }

  return (
    <Popover>
      {/* Сама надпись — ссылка в RuStore: клик ведёт прямо в магазин, а по
          наведению рядом раскрывается QR для тех, кто хочет поставить
          приложение с телефона. Раньше клик только открывал/закрывал окно с
          QR, и человек, нажавший на кнопку, не получал того, чего ждал. */}
      <PopoverTrigger
        openOnHover
        delay={150}
        closeDelay={200}
        nativeButton={false}
        render={
          <a
            href={RUSTORE_APP_URL}
            target='_blank'
            rel='noopener noreferrer'
            onClick={() => trackAppDownloadClick(place)}
          />
        }
        className={triggerClassName}
      >
        <Smartphone className='size-4' />
        {children}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className='w-64 p-5 shadow-lg ring-1 ring-black/5'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <p className='text-sm font-semibold text-gray-900 dark:text-white'>Приложение AgroZone для Android</p>
          {/* QR всегда чёрный на белом, даже в тёмной теме: инвертированный код
              многие камеры не считывают. */}
          <div className='rounded-lg bg-white p-2'>
            <Image
              src={RUSTORE_APP_QR_SRC}
              alt='QR-код для установки приложения из RuStore'
              width={144}
              height={144}
              unoptimized
            />
          </div>
          <p className='text-xs text-gray-600 dark:text-neutral-300'>
            Наведите камеру телефона на код — откроется RuStore
          </p>
          <a
            href={RUSTORE_APP_URL}
            target='_blank'
            rel='noopener noreferrer'
            onClick={() => trackAppDownloadClick(place)}
            className='text-primary text-xs underline underline-offset-2'
          >
            Открыть в RuStore
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}
