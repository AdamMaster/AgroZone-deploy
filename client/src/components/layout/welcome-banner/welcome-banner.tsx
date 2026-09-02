'use client'

import { useWelcomeBannerStore } from '@/store'
import { X } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui'

import { useMounted } from '@/shared/hooks'

// Приветственный баннер на главной для новых посетителей — сайт только
// запускается, объявлений пока немного. Задача баннера — не извиняться за
// пустоту (это программирует негативное ожидание ещё до просмотра
// объявлений), а сразу предложить выгоду: разместиться одним из первых
// бесплатно. Закрытие запоминается через localStorage (см.
// useWelcomeBannerStore), баннер не всплывает повторно у тех, кто его уже
// закрыл. Показывается только на главной (см. использование в
// app/(main)/(home)/page.tsx), а не на всех страницах сайта.
export const WelcomeBanner = () => {
  const { dismissed, dismiss } = useWelcomeBannerStore()

  // Значение из persist (localStorage) появляется только после гидратации
  // на клиенте (тот же паттерн, что и CookieConsentBanner) — ждём
  // монтирования, чтобы баннер не мигал на долю секунды у тех, кто уже
  // его закрыл.
  const mounted = useMounted()

  if (!mounted || dismissed) {
    return null
  }

  return (
    <div className='bg-primary/5 border-primary/20 relative mb-4 rounded-xl border px-4 py-3 sm:px-5 sm:py-4'>
      <button
        type='button'
        onClick={dismiss}
        aria-label='Закрыть'
        className='absolute top-2.5 right-2.5 rounded-md p-1 text-gray-400 hover:bg-gray-200/50 hover:text-gray-600 dark:hover:bg-white/10'
      >
        <X className='size-4' />
      </button>
      <div className='flex flex-col items-start gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
        <p className='text-sm text-gray-700 dark:text-neutral-200'>
          <span className='font-semibold text-gray-900 dark:text-white'>AgroZone</span> только начинает свой путь.{' '}
          Разместите объявление <span className='font-semibold'>бесплатно на весь срок публикации</span> и станьте одним
          из первых участников <span className='font-semibold'>AgroZone</span>.
        </p>
        <Button render={<Link href='/ads/create' />} size='lg' className='w-full shrink-0 sm:w-auto'>
          Разместить объявление
        </Button>
      </div>
    </div>
  )
}
