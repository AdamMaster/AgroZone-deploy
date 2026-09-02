'use client'

import { Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { Button, Heading, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

import { cn } from '@/lib/utils'

import { AdShortCard, AdShortCardSkeleton } from '../../ads/components'
import { useMyAds } from '../../ads/hooks'

// Прячем плавающую кнопку "Разместить объявление" (см. ниже) при скролле
// вниз и возвращаем при скролле вверх — то же поведение, что у Авито,
// чтобы кнопка не перекрывала объявления в длинном списке, но оставалась
// под рукой, как только пользователь начинает скроллить назад. Слушаем
// window.scroll (страница скроллится целиком, отдельного контейнера с
// overflow тут нет), throttlим через requestAnimationFrame — тот же приём,
// что и в ad-detail.tsx для скролла галереи.
const useFabVisibleOnScroll = () => {
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    let frame = 0
    let ticking = false

    const handleScroll = () => {
      if (ticking) return

      ticking = true
      frame = requestAnimationFrame(() => {
        const currentY = window.scrollY
        const delta = currentY - lastScrollYRef.current

        // У самого верха страницы кнопка видна всегда — иначе на первых
        // пикселях скролла (например, из-за резинового оттягивания на iOS)
        // она бы дёргалась. Дальше — обычное сравнение направления, но с
        // минимальным порогом (4px), чтобы не мигать от micro-скролла.
        if (currentY <= 8) {
          setIsVisible(true)
        } else if (Math.abs(delta) > 4) {
          setIsVisible(delta < 0)
        }

        lastScrollYRef.current = currentY
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return isVisible
}

export const ContentAds = () => {
  const { ads, isLoading } = useMyAds()
  const isFabVisible = useFabVisibleOnScroll()

  if (isLoading)
    return (
      <div className='max-w-[800px]'>
        <Heading level={2} className='mb-6'>
          Мои объявления
        </Heading>
        <div className='mb-5 flex gap-3'>
          <Skeleton className='h-11 w-[150px] rounded-lg' />
          <Skeleton className='h-11 w-[150px] rounded-lg' />
          <Skeleton className='h-11 w-[150px] rounded-lg' />
        </div>
        <div className='grid grid-cols-1 gap-6'>
          <AdShortCardSkeleton />
          <AdShortCardSkeleton />
          <AdShortCardSkeleton />
        </div>
      </div>
    )

  const publishedAds = ads.filter(ad => ad.status === 'PUBLISHED' || ad.status === 'PENDING')
  const archivedAds = ads.filter(ad => ad.status === 'ARCHIVED')
  const draftAds = ads.filter(ad => ad.status === 'DRAFT')
  const rejectedAds = ads.filter(ad => ad.status === 'REJECTED')
  const expiresAt = ads.filter(ad => ad.status === 'EXPIRED')

  const tabs = [
    { value: 'published', label: 'Опубликованные', ads: publishedAds },
    { value: 'archived', label: 'Архив', ads: archivedAds },
    { value: 'draft', label: 'Черновики', ads: draftAds },
    { value: 'rejected', label: 'Отклонённые', ads: rejectedAds },
    { value: 'expires', label: 'Завершенные', ads: expiresAt }
  ].filter(tab => tab.ads.length > 0)

  if (!ads?.length) {
    return (
      <div className='flex flex-col items-center justify-center text-center'>
        <Heading className='mb-2 font-semibold' level={3}>
          У вас нет объявлений
        </Heading>
        <p className='mb-4 leading-5 text-gray-500'>
          Разместите первое объявление
          <br /> и найдите покупателей по всей России.
        </p>
        <Link
          href='/ads/create'
          className='hover:bg-primary-foreground bg-primary mb-8 flex h-10 items-center justify-center rounded-lg px-4 text-white transition-colors'
        >
          Разместить объявление
        </Link>
        <Image src='/images/empty-box.svg' width={250} height={250} alt='Нет объявлений' />
      </div>
    )
  }

  return (
    <div className='m-full max-w-[800px]'>
      <Heading level={2} className='mb-4'>
        Мои объявления
      </Heading>
      <Tabs defaultValue='published'>
        <div className='mb-4 overflow-x-auto'>
          <TabsList variant='line'>
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className='p-0'>
                {tab.label}
                <ItemsCount count={tab.ads.length} />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map(tab => (
          <TabsContent className='grid grid-cols-1 gap-6' key={tab.value} value={tab.value}>
            {tab.ads.map(ad => (
              <AdShortCard key={ad.id} ad={ad} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
      <Link
        href='/ads/create'
        className={cn(
          'hover:bg-primary-foreground l-4 fixed right-4 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-30 flex h-12 items-center justify-center gap-3 rounded-lg bg-neutral-800 px-5 text-white shadow-lg transition-all duration-300 md:hidden',
          isFabVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-20 opacity-0'
        )}
        aria-label='Разместить объявление'
      >
        Разместить объявление
        <Plus className='size-5' />
      </Link>
    </div>
  )
}

function ItemsCount({ count }: { count: number }) {
  return (
    <div className='flex size-4.5 items-center justify-center rounded-full bg-gray-200 text-xs leading-[1] font-medium'>
      {count}
    </div>
  )
}
