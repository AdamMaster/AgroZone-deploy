'use client'

import { useAppModal } from '@/store'
import { Crown, Edit, Ellipsis, Heart, ImageIcon, MapPin, Pencil, Phone, Share2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

import { UserType } from '@/components/features/auth/types'
import { Avatar, AvatarFallback, AvatarImage, Button, ButtonBack, Heading, MultilineText } from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { PRICE_UNITS } from '@/shared/constants/units'
import { USER_TYPE_LABELS } from '@/shared/constants/user-types'
import { useProfile } from '@/shared/hooks'
import { formatFeatureValue, formatPhoneNumber, isFutureDate, isPremiumActive, pluralizeRu } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { UserAvatar } from '../../user/components'
import { AD_PRICE_HIGHLIGHT_CLASS } from '../constants/ad-services.constants'
import {
  useAd,
  useAdCounters,
  useAdPhone,
  useAddFavorite,
  useArchiveAd,
  useRemoveAd,
  useRemoveFavorite
} from '../hooks'
import { IAd, ICategoryFeature } from '../types/ad.types'
import { AdBadgeChip } from './ad-badge-chip'
import { AdCountersPanel } from './ad-counters-panel'
import { AdServicesStatusHandler } from './ad-services-status-handler'
import { AdViewsStats } from './ad-views-stats'
import { BumpStatusHandler } from './bump-status-handler'
import { CategoryBreadcrumbItem, CategoryBreadcrumbs } from './category-breadcrumbs'
import { FavoriteButton } from './favorite-button'
import { ReportAdDialog } from './report-ad-dialog'
import { SimilarAdsSection } from './similar-ads-section'

import 'yet-another-react-lightbox/styles.css'

interface AdDetailProps {
  // Объявление, полученное на сервере (SSR) — используется как initialData
  // для react-query, чтобы не делать повторный запрос при первом рендере.
  ad: IAd
  categoryFeatures?: ICategoryFeature[]
  // Путь категорий до текущей (родители → сама категория) с готовыми
  // ссылками на каталог — считается на сервере по ad.categoryId.
  categoryPath?: CategoryBreadcrumbItem[]
  // Блок "Похожие объявления" — та же категория, без текущего объявления,
  // получен на сервере вместе с самим объявлением (см. ads/[id]/page.tsx).
  // Пустой массив по умолчанию — секция просто не рендерится.
  similarAds?: IAd[]
}

const formatDate = (value: Date | string | null) => {
  if (!value) return null

  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

export const AdDetail = ({
  ad: initialAd,
  categoryFeatures = [],
  categoryPath = [],
  similarAds = []
}: AdDetailProps) => {
  const router = useRouter()
  const { user } = useProfile()
  const { onOpen } = useAppModal()
  const { ad } = useAd(initialAd.id, initialAd)

  const handleWriteClick = () => {
    const target = `/profile/settings/messages?ad=${ad.id}`

    if (user) {
      router.push(target)
    } else {
      onOpen('login', { returnTo: target })
    }
  }

  const galleryRef = useRef<HTMLDivElement>(null)

  const [activeImage, setActiveImage] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const { addFavorite, isAddingFavorite } = useAddFavorite()
  const { removeFavorite, isRemovingFavorite } = useRemoveFavorite()
  const { archiveAd, isLoadingArchive } = useArchiveAd()
  const { removeAd, isLoadingRemove } = useRemoveAd()
  const { revealPhone, isRevealingPhone } = useAdPhone()

  const scrollToImage = (index: number) => {
    const slide = galleryRef.current?.children[index] as HTMLElement | undefined

    slide?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
  }

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

  const isOwner = !!user && user.id === ad.userId

  const onClickFavorite = () => {
    if (ad.isFavorite) {
      removeFavorite(ad.id)
    } else {
      addFavorite(ad.id)
    }
  }

  const handleShowPhone = () => {
    if (!user) {
      onOpen('login')
      return
    }

    revealPhone(ad.id, { onSuccess: data => setRevealedPhone(data.phone) })
  }

  const handleArchive = () => archiveAd(ad.id)
  const handleRemove = () => removeAd(ad.id, { onSuccess: () => router.push('/profile/settings/ads') })

  const handleShareTelegram = () => {
    const url = window.location.href
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(ad.title)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const handleShareWhatsapp = () => {
    const url = window.location.href
    window.open(`https://wa.me/?text=${encodeURIComponent(`${ad.title} ${url}`)}`, '_blank', 'noopener,noreferrer')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Не удалось скопировать ссылку')
    }
  }

  const features = (ad.features as unknown as Record<string, unknown>) || {}

  const filledFeatures = categoryFeatures
    .map(feature => ({
      feature,
      value: formatFeatureValue(feature, features)
    }))
    .filter((item): item is { feature: ICategoryFeature; value: string } => item.value !== null)

  const publishedDate = formatDate(ad.publishedAt)

  const bumpedDate =
    ad.bumpedAt && ad.publishedAt && new Date(ad.bumpedAt) > new Date(ad.publishedAt) ? formatDate(ad.bumpedAt) : null
  const updatedDate = bumpedDate && bumpedDate !== publishedDate ? bumpedDate : null

  const slides = useMemo(() => ad.images.map(src => ({ src })), [ad.images])

  const closeLightbox = () => {
    setIsLightboxOpen(false)
    scrollToImage(activeImage)
  }

  const isSellerPremium = isPremiumActive(ad.user?.premiumUntil)
  const isPriceHighlighted = isFutureDate(ad.priceHighlightUntil) || isSellerPremium
  const isBadgeShown = isFutureDate(ad.badgeUntil) && !!ad.badge

  const { counters } = useAdCounters(ad.id)

  return (
    <div>
      <div className='max-w-[950px]'>
        <BumpStatusHandler adId={ad.id} />
        <AdServicesStatusHandler adId={ad.id} />
        {!isOwner && user && (
          <ReportAdDialog adId={ad.id} open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} />
        )}
        <div className='sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between bg-white md:hidden dark:bg-neutral-800'>
          <ButtonBack onClick={() => router.back()} className='rounded-none shadow-none!' />
          {isOwner ? (
            <div className='flex items-center'>
              <button
                type='button'
                onClick={() => router.push(`/ads/${ad.id}/edit`)}
                className='flex size-13 items-center justify-center'
                aria-label='Редактировать объявление'
              >
                <Edit size={20} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className='flex size-13 items-center justify-center' aria-label='Ещё'>
                  <Ellipsis size={20} />
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-48' align='end'>
                  <DropdownMenuItem onClick={handleShareTelegram}>Telegram</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareWhatsapp}>WhatsApp</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink}>Скопировать ссылку</DropdownMenuItem>
                  <DropdownMenuItem
                    className='text-red-500 hover:text-red-500!'
                    disabled={isLoadingRemove}
                    onClick={handleRemove}
                  >
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className='flex items-center'>
              <button
                type='button'
                onClick={onClickFavorite}
                disabled={isAddingFavorite || isRemovingFavorite}
                className='flex size-13 items-center justify-center disabled:opacity-50'
                aria-label={ad.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              >
                <Heart
                  size={20}
                  className={cn('transition-colors', ad.isFavorite ? 'fill-current text-red-500' : '')}
                />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className='flex size-13 items-center justify-center' aria-label='Ещё'>
                  <Ellipsis size={20} />
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-48' align='end'>
                  <DropdownMenuItem onClick={handleShareTelegram}>Telegram</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareWhatsapp}>WhatsApp</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink}>Скопировать ссылку</DropdownMenuItem>
                  {user && (
                    <DropdownMenuItem
                      className='text-red-500 hover:text-red-500!'
                      onClick={() => {
                        setTimeout(() => setIsReportDialogOpen(true), 0)
                      }}
                    >
                      Пожаловаться
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <div className='absolute top-0 -left-18 hidden h-full md:block'>
          <ButtonBack onClick={() => router.back()} />
        </div>
        <CategoryBreadcrumbs
          items={[{ name: 'Объявления', href: '/catalog' }, ...categoryPath]}
          className='hidden sm:flex'
        />

        <Heading level={1} className='mb-6 hidden sm:block'>
          {ad.title}
        </Heading>
        {isOwner && (
          <>
            <div className='hidden sm:block'>
              <AdViewsStats adId={ad.id} />
              {counters && (
                <div className='mb-6 flex gap-6 text-sm text-gray-500 dark:text-gray-400'>
                  <span>
                    Всего просмотров:{' '}
                    <span className='font-medium text-gray-900 dark:text-white'>
                      {counters.viewsTotal}
                      {counters.viewsToday > 0 && (
                        <span className='text-primary font-medium'> (+{counters.viewsToday})</span>
                      )}
                    </span>
                  </span>
                  <span>
                    В избранном:{' '}
                    <span className='font-medium text-gray-900 dark:text-white'>{counters.favoritesCount}</span>
                  </span>
                </div>
              )}
            </div>
            <div className='sm:hidden'>
              <div className='mb-3 flex flex-col gap-1'>
                {ad.status === 'PUBLISHED' && (
                  <Button size='lg' className='w-full' onClick={() => router.push(`/ads/${ad.id}/promote`)}>
                    Поднять объявление
                  </Button>
                )}
                {(ad.status === 'PUBLISHED' || ad.status === 'PENDING') && (
                  <Button
                    variant='secondary'
                    size='lg'
                    className='w-full'
                    onClick={handleArchive}
                    disabled={isLoadingArchive}
                  >
                    Снять с публикации
                  </Button>
                )}
              </div>
              <AdCountersPanel adId={ad.id} />
            </div>
          </>
        )}

        <div className='mb-8 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_280px] lg:grid-cols-[1fr_360px] lg:gap-5 lg:gap-10'>
          <div>
            {ad.images.length > 0 ? (
              <div className='relative mb-0.5 sm:mb-2'>
                {isBadgeShown && <AdBadgeChip badge={ad.badge!} className='absolute top-2 left-2 z-10' />}
                <div
                  ref={galleryRef}
                  className='flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain rounded-xl bg-gray-100 [&::-webkit-scrollbar]:hidden'
                >
                  {ad.images.map((image, index) => (
                    <button
                      key={image + index}
                      type='button'
                      onClick={() => setIsLightboxOpen(true)}
                      className='relative w-full flex-shrink-0 snap-center pt-[76%] lg:pt-[80%]'
                    >
                      <Image
                        src={image}
                        alt={`${ad.title} — фото ${index + 1}`}
                        className='h-full w-full object-cover'
                        fill
                        sizes='(min-width: 1024px) 700px, 100vw'
                        priority={index === 0}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className='relative mb-2 overflow-hidden rounded-xl bg-gray-100 pt-[76%] lg:pt-[80%]'>
                <ImageIcon size={64} className='absolute top-1/2 left-1/2 -translate-1/2 text-gray-400' />
              </div>
            )}

            {ad.images.length > 1 && (
              <div className='flex gap-0.5 overflow-x-auto sm:gap-2'>
                {ad.images.map((image, index) => (
                  <button
                    key={image + index}
                    type='button'
                    onClick={() => scrollToImage(index)}
                    className={cn(
                      'relative size-16 flex-shrink-0 overflow-hidden rounded-md border border-transparent bg-gray-100 sm:rounded-lg',
                      index === activeImage && 'border-primary'
                    )}
                  >
                    <Image
                      src={image}
                      alt={`${ad.title} — фото ${index + 1}`}
                      className='object-cover'
                      fill
                      sizes='100px'
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Heading level={1} as='p' className='mb-2 block text-lg sm:hidden'>
              {ad.title}
            </Heading>
            <div className='relative mb-4 flex items-start justify-between gap-2'>
              <p className='text-xl font-bold sm:text-2xl'>
                <span className={cn(isPriceHighlighted && AD_PRICE_HIGHLIGHT_CLASS)}>
                  {ad.price ? `${ad.price.toLocaleString('ru-RU')} ₽` : 'Цена договорная'}
                </span>
                {ad.price && ad.unit && ad.unit !== 'ITEM' && PRICE_UNITS[ad.unit] && (
                  <span className='block text-sm font-normal text-gray-500'>
                    за {PRICE_UNITS[ad.unit].toLowerCase()}
                  </span>
                )}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label='Поделиться'
                  className='absolute top-0 right-8 hidden size-8 items-center justify-center text-gray-400 transition-colors hover:text-gray-600 sm:flex'
                >
                  <Share2 className='size-5' />
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-44'>
                  <DropdownMenuItem onClick={handleShareTelegram}>Telegram</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShareWhatsapp}>WhatsApp</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink}>Скопировать ссылку</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <FavoriteButton
                onClick={onClickFavorite}
                isFavorite={!!ad.isFavorite}
                isLoading={isAddingFavorite || isRemovingFavorite}
                className='hidden sm:flex'
              />
            </div>

            <div className='mb-8'>
              {isOwner ? (
                <Button
                  className='hidden w-full sm:flex'
                  variant='secondary'
                  size='lg'
                  onClick={() => router.push(`/ads/${ad.id}/edit`)}
                >
                  Редактировать объявление
                </Button>
              ) : (
                <div className='flex gap-1.5 sm:flex-col lg:flex-row'>
                  <Button
                    variant='default'
                    size='lg'
                    className='h-13! grow px-8'
                    onClick={revealedPhone ? undefined : handleShowPhone}
                    disabled={isRevealingPhone}
                    nativeButton={!revealedPhone}
                    render={revealedPhone ? <a href={`tel:+${revealedPhone}`} /> : undefined}
                  >
                    {revealedPhone
                      ? formatPhoneNumber(revealedPhone)
                      : isRevealingPhone
                        ? 'Показ номера…'
                        : 'Показать телефон'}
                  </Button>
                  <Button size='lg' variant='secondary' className='h-13! px-8' onClick={handleWriteClick}>
                    Написать
                  </Button>
                </div>
              )}
            </div>
            <Link href={`/sellers/${ad.user!.id}`} className='mb-4 flex items-center gap-3'>
              <UserAvatar user={ad.user!} className='size-12' />
              <div>
                <div className='flex items-center gap-1.5'>
                  <p className='font-medium'>{ad.user?.displayName ?? 'Пользователь'}</p>
                </div>
                {publishedDate && <p className='text-xs text-gray-500'>Опубликовано {publishedDate}</p>}
                {updatedDate && <p className='text-xs text-gray-500'>Обновлено {updatedDate}</p>}
                {!!ad.user?.adsCount && (
                  <p className='text-xs text-gray-500'>
                    Ещё {ad.user.adsCount} {pluralizeRu(ad.user.adsCount, ['объявление', 'объявления', 'объявлений'])}{' '}
                    продавца
                  </p>
                )}
              </div>
            </Link>
            <div className='mb-6 flex gap-2'>
              {ad.user?.type === UserType.Individual && (
                <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>
                  {USER_TYPE_LABELS[ad.user.type]}
                </span>
              )}
              {ad.user?.type !== UserType.Individual && ad.user?.businessVerifiedAt && ad.user?.businessName && (
                <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>
                  {ad.user.businessName}
                </span>
              )}
              {isSellerPremium && (
                <span className='flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700'>
                  <Crown size={11} />
                  Премиум
                </span>
              )}
            </div>
            {!isOwner && user && (
              <div className='hidden sm:block'>
                <ReportAdDialog adId={ad.id} />
              </div>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-8'>
          <div>
            <Heading level={4} className='mb-2'>
              Адрес
            </Heading>
            <address className='flex gap-2 not-italic'>
              <MapPin className='size-5 flex-shrink-0 translate-y-0.5' />
              {ad.address}
            </address>
          </div>

          {ad.description && (
            <div>
              <Heading level={4} className='mb-2'>
                Описание
              </Heading>
              <MultilineText text={ad.description} />
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
                    <dt className='text-gray-600'>{feature.label}</dt>:
                    <dd className='text-right font-medium'>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {ad.images.length > 0 && (
          <Lightbox
            open={isLightboxOpen}
            close={closeLightbox}
            index={activeImage}
            slides={slides}
            plugins={[Zoom]}
            on={{ view: ({ index }) => setActiveImage(index) }}
            animation={{ swipe: 0 }}
            styles={{ slide: { maxWidth: 1280, margin: '0 auto' } }}
          />
        )}
      </div>
      {similarAds.length > 0 && (
        <div className='mt-12'>
          <SimilarAdsSection ads={similarAds} />
        </div>
      )}
    </div>
  )
}
