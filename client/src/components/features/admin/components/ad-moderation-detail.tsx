'use client'

import { ImageIcon, MapPin } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { CategoryBreadcrumbs } from '@/components/features/ads/components/category-breadcrumbs'
import { useModerationAd, usePublishAd } from '@/components/features/ads/hooks'
import { ICategoryFeature } from '@/components/features/ads/types/ad.types'
import { useCategories } from '@/components/features/categories/hooks/use-categories'
import { Avatar, AvatarFallback, Button, ButtonBack, Heading, Loading } from '@/components/ui'

import { PRICE_UNITS } from '@/shared/constants/units'
import { findCategoryById, formatPhoneNumber, getPathToCategory } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { RejectAdDialog } from './reject-ad-dialog'

import 'yet-another-react-lightbox/styles.css'

interface AdModerationDetailProps {
  id: string
}

const STATUS_LABELS: Partial<Record<string, string>> = {
  PENDING: 'На модерации',
  REJECTED: 'Отклонено',
  PUBLISHED: 'Опубликовано',
  EXPIRED: 'Срок действия истёк',
  DRAFT: 'Черновик',
  ARCHIVED: 'Снято с публикации'
}

const formatFeatureValue = (feature: ICategoryFeature, value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null

  if (feature.type === 'BOOLEAN') return value ? 'Да' : 'Нет'
  if (Array.isArray(value)) return value.length ? value.join(', ') : null

  return String(value)
}

export const AdModerationDetail = ({ id }: AdModerationDetailProps) => {
  const router = useRouter()
  const { ad, isLoading } = useModerationAd(id)
  const { categories } = useCategories()
  const { publishAd, isLoadingPublish } = usePublishAd()

  const galleryRef = useRef<HTMLDivElement>(null)

  const [activeImage, setActiveImage] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const scrollToImage = (index: number) => {
    const slide = galleryRef.current?.children[index] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  const slides = useMemo(() => (ad?.images ?? []).map(src => ({ src })), [ad?.images])

  useEffect(() => {
    const container = galleryRef.current
    if (!container) return

    let frame: number

    const handleScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const index = Math.round(container.scrollLeft / container.clientWidth)
        setActiveImage(prev => (prev === index ? prev : index))
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  if (isLoading || !ad) return <Loading />

  // Цепочка категорий от корня до текущей — как на публичной странице
  // (см. AdPage): нужна и для хлебных крошек со ссылками на каталог, и для
  // лейблов характеристик (берём их с самой глубокой, целевой категории).
  const categoryChain = getPathToCategory(categories, ad.categoryId)
    .map(catId => findCategoryById(categories, catId))
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const categoryFeatures = categoryChain.at(-1)?.categoryFeatures ?? []

  const categoryPath = categoryChain.map(c => ({ name: c.name, href: `/catalog/${c.fullPath}` }))

  const features = (ad.features as unknown as Record<string, unknown>) || {}

  const filledFeatures = categoryFeatures
    .map(feature => ({
      feature,
      value: formatFeatureValue(feature, features[feature.name])
    }))
    .filter((item): item is { feature: ICategoryFeature; value: string } => item.value !== null)

  const closeLightbox = () => {
    setIsLightboxOpen(false)
    scrollToImage(activeImage)
  }

  const handlePublish = () => {
    publishAd(ad.id)
  }

  return (
    <div className='max-w-[950px]'>
      <ButtonBack className='absolute top-0 -left-18' onClick={() => router.back()} />

      <CategoryBreadcrumbs items={[{ name: 'Объявления', href: '/catalog' }, ...categoryPath]} />

      <div className='mb-6 flex items-center gap-2'>
        <Heading level={1}>{ad.title}</Heading>
        <span className='rounded-2xl bg-orange-200 px-2 py-0.5 text-xs'>{STATUS_LABELS[ad.status] ?? ad.status}</span>
      </div>

      <div className='mb-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]'>
        <div>
          {ad.images.length > 0 ? (
            <div
              ref={galleryRef}
              className='mb-2 flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain rounded-xl bg-gray-100 [&::-webkit-scrollbar]:hidden'
            >
              {ad.images.map((image, index) => (
                <button
                  key={image + index}
                  type='button'
                  onClick={() => setIsLightboxOpen(true)}
                  className='relative w-full flex-shrink-0 snap-center pt-[66%]'
                >
                  <Image
                    src={image}
                    alt={`${ad.title} — фото ${index + 1}`}
                    className='h-full w-full object-cover'
                    fill
                    sizes='(min-width: 1024px) 640px, 100vw'
                    priority={index === 0}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className='relative mb-2 overflow-hidden rounded-xl bg-gray-100 pt-[66%]'>
              <ImageIcon size={64} className='absolute top-1/2 left-1/2 -translate-1/2 text-gray-400' />
            </div>
          )}

          {ad.images.length > 1 && (
            <div className='flex gap-2 overflow-x-auto'>
              {ad.images.map((image, index) => (
                <button
                  key={image + index}
                  type='button'
                  onClick={() => scrollToImage(index)}
                  className={cn(
                    'relative size-16 flex-shrink-0 overflow-hidden rounded-lg border-1 border-transparent bg-gray-100',
                    index === activeImage && 'border-primary'
                  )}
                >
                  <Image
                    src={image}
                    alt={`${ad.title} — фото ${index + 1}`}
                    className='object-cover'
                    fill
                    sizes='64px'
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className='mb-4 text-2xl font-bold'>
            {ad.price ? `${ad.price.toLocaleString('ru-RU')} ₽` : 'Цена договорная'}
            {/* ITEM ("Целиком") — цена без разбивки на единицы измерения,
                суффикс "за X" для него не нужен (см. shared/constants/units.ts) */}
            {ad.price && ad.unit && ad.unit !== 'ITEM' && PRICE_UNITS[ad.unit] && (
              <span className='block text-sm font-normal text-gray-500'>за {PRICE_UNITS[ad.unit].toLowerCase()}</span>
            )}
          </p>
          <div className='mb-8 flex gap-1.5'>
            {ad.status !== 'PUBLISHED' && (
              <Button
                variant='secondary'
                size='lg'
                className='grow px-8'
                disabled={isLoadingPublish}
                onClick={handlePublish}
              >
                Опубликовать
              </Button>
            )}
            {ad.status !== 'REJECTED' && <RejectAdDialog adId={ad.id} />}
          </div>

          <div className='mb-6 flex items-center gap-3'>
            <Avatar size='lg'>
              <AvatarFallback>{ad.user?.displayName?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className='text-sm font-medium'>{ad.user?.displayName ?? 'Пользователь'}</p>
              {ad.user?.email && <p className='text-xs text-gray-500'>{ad.user.email}</p>}
              {ad.user?.phones?.[0]?.phone && (
                <p className='flex items-center gap-1 text-xs text-gray-500'>
                  {formatPhoneNumber(ad.user.phones[0].phone)}
                </p>
              )}
            </div>
          </div>

          <address className='mb-4 flex items-center gap-2 not-italic'>
            <MapPin className='size-5 flex-shrink-0' />
            {ad.address}
          </address>
        </div>
      </div>

      {ad.description && (
        <div className='mb-8'>
          <Heading level={4} className='mb-2'>
            Описание
          </Heading>
          <p className='leading-6 whitespace-pre-wrap'>{ad.description}</p>
        </div>
      )}

      {filledFeatures.length > 0 && (
        <div>
          <Heading level={4} className='mb-3'>
            Характеристики
          </Heading>
          <dl className='grid grid-cols-1 gap-x-6 gap-y-2'>
            {filledFeatures.map(({ feature, value }) => (
              <div key={feature.id} className='flex gap-2'>
                <dt className='text-gray-600'>{feature.label}</dt>:<dd className='text-right font-medium'>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {ad.images.length > 0 && (
        <Lightbox
          open={isLightboxOpen}
          close={closeLightbox}
          index={activeImage}
          slides={slides}
          plugins={[Zoom]}
          on={{ view: ({ index }) => setActiveImage(index) }}
          styles={{ slide: { maxWidth: 1280, margin: '0 auto' } }}
        />
      )}
    </div>
  )
}
