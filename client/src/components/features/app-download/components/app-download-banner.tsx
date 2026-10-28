'use client'

import { useAppDownloadBannerStore } from '@/store'
import { X } from 'lucide-react'
import Image from 'next/image'

import { useSiteFlags } from '@/components/features/site-settings/hooks/use-site-flags'
import { Button } from '@/components/ui'

import { useMounted } from '@/shared/hooks'

import { RUSTORE_APP_URL } from '../constants'
import { isAndroidBrowser, isStandaloneDisplay } from '../utils'
import { trackAppDownloadClick } from './app-download-link'

// Полоса над шапкой для тех, кто открыл сайт в браузере на Android: приложение
// удобнее (уведомления о сообщениях, быстрый вход). Показываем только им —
// на iOS приложения нет, на компьютере его предлагает ссылка в шапке, а в
// WebView/PWA призыв «скачать» ни к чему. Это обычный блок в потоке страницы, а
// не плавающая кнопка: справа внизу уже живёт кнопка поддержки.
export const AppDownloadBanner = () => {
  const { dismissed, dismiss } = useAppDownloadBannerStore()

  // И localStorage, и User-Agent известны только на клиенте — до монтирования
  // ничего не рисуем, чтобы серверная и клиентская разметка совпали.
  const mounted = useMounted()
  const { appDownload } = useSiteFlags()

  if (!appDownload || !mounted || dismissed || !isAndroidBrowser() || isStandaloneDisplay()) {
    return null
  }

  return (
    <div className='bg-primary/5 border-primary/20 relative border-b md:hidden'>
      <div className='flex items-center gap-3 py-2.5 pr-10 pl-4'>
        <Image src='/apple-touch-icon.png' alt='' width={40} height={40} className='size-10 shrink-0 rounded-xl' />
        <div className='min-w-0 grow'>
          <p className='truncate text-sm font-semibold text-gray-900 dark:text-white'>AgroZone для Android</p>
          <p className='truncate text-xs text-gray-600 dark:text-neutral-300'>Удобнее в приложении</p>
        </div>
        <Button
          size='sm'
          nativeButton={false}
          render={
            <a
              href={RUSTORE_APP_URL}
              target='_blank'
              rel='noopener noreferrer'
              onClick={() => trackAppDownloadClick('banner')}
            />
          }
          className='shrink-0'
        >
          Скачать
        </Button>
      </div>
      <button
        type='button'
        onClick={dismiss}
        aria-label='Закрыть'
        className='absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:bg-gray-200/50 hover:text-gray-600 dark:hover:bg-white/10'
      >
        <X className='size-4' />
      </button>
    </div>
  )
}
