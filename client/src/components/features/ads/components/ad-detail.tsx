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
import { Avatar, AvatarFallback, AvatarImage, Button, ButtonBack, Heading } from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { PRICE_UNITS } from '@/shared/constants/units'
import { USER_TYPE_LABELS } from '@/shared/constants/user-types'
import { useProfile } from '@/shared/hooks'
import { formatFeatureValue, formatPhoneNumber, isFutureDate, isPremiumActive, pluralizeRu } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { UserAvatar } from '../../user/components'
import { AD_PRICE_HIGHLIGHT_CLASS } from '../constants/ad-services.constants'
import { useAd, useAdCounters, useAddFavorite, useAdPhone, useArchiveAd, useRemoveAd, useRemoveFavorite } from '../hooks'
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

  // U1 в ROADMAP.md: раньше это была голая <Link href="/profile/settings/
  // messages?ad=...">. Гость по ней улетал в middleware.ts, который для
  // защищённых /profile/*-страниц просто редиректил на главную —
  // объявление терялось, диалог с продавцом не открывался вообще никогда.
  // Теперь для гостя вместо перехода открываем модалку входа прямо здесь
  // (страница объявления никуда не уходит), а после входа/регистрации
  // returnTo сам унесёт на нужный диалог — см. form-login.tsx,
  // form-register-sms.tsx.
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
  // B2 в ROADMAP.md: раньше это был чисто визуальный флаг
  // (isPhoneRevealed) — сами цифры (ad.phone) уже приезжали в обычном
  // ответе findOne, клик их просто показывал/прятал на экране. Теперь
  // номера в ad вообще нет (см. ad.types.ts), храним то, что реально
  // пришло по клику от отдельного защищённого эндпоинта — null, пока не
  // раскрыт.
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null)
  // Контролируемое состояние для ReportAdDialog — пункт "Пожаловаться" в
  // мобильном дропдауне "..." открывает тот же диалог, что и текстовая
  // ссылка внизу страницы (см. ReportAdDialog: controlled-режим без
  // собственного триггера).
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  const { addFavorite, isAddingFavorite } = useAddFavorite()
  const { removeFavorite, isRemovingFavorite } = useRemoveFavorite()
  const { archiveAd, isLoadingArchive } = useArchiveAd()
  const { removeAd, isLoadingRemove } = useRemoveAd()
  const { revealPhone, isRevealingPhone } = useAdPhone()

  const scrollToImage = (index: number) => {
    const slide = galleryRef.current?.children[index] as HTMLElement | undefined
    // behavior: 'auto' — без плавной прокрутки (аналог swipe: 0 в
    // Lightbox выше), клик по миниатюре сразу переключает фото, без
    // анимации скольжения.
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

  // isFavorite больше не отдельный локальный стейт — раньше он менялся тут
  // же безусловно на каждый клик (setIsFavorite(prev => !prev)), независимо
  // от результата мутации, из-за чего при ошибке (например, у
  // неавторизованного пользователя) сердечко оставалось закрашенным,
  // несмотря на всплывший тост с ошибкой. Теперь значение берётся напрямую
  // из ad.isFavorite (кэш react-query, ключ ['ad-public', id] — см.
  // use-ad.ts), который сами хуки избранного корректно оптимистично
  // обновляют и откатывают при ошибке (см. use-add-favorite.ts /
  // use-remove-favorite.ts).
  const onClickFavorite = () => {
    if (ad.isFavorite) {
      removeFavorite(ad.id)
    } else {
      addFavorite(ad.id)
    }
  }

  // B2 в ROADMAP.md: тот же приём, что и в handleWriteClick выше — гостю
  // сразу предлагаем войти, не дёргая сеть впустую (эндпоинт всё равно за
  // AuthGuard, см. AdsController.getPhone). Без returnTo — после входа
  // просто остаёмся на этой же странице объявления, отдельно нажимать
  // "Показать телефон" второй раз можно сразу.
  const handleShowPhone = () => {
    if (!user) {
      onOpen('login')
      return
    }

    revealPhone(ad.id, { onSuccess: data => setRevealedPhone(data.phone) })
  }

  // Доп. меню владельца в мобильной верхней панели (см. ниже) — те же
  // действия и хуки, что уже используются в списке "Мои объявления"
  // (ad-short-card.tsx), просто без полного разбора по всем статусам:
  // сюда обычно попадают через опубликованное объявление.
  const handleArchive = () => archiveAd(ad.id)
  const handleRemove = () => removeAd(ad.id, { onSuccess: () => router.push('/profile/settings/ads') })

  // "Поделиться" — раньше был только Web Share API (navigator.share) с
  // фолбэком на копирование ссылки: на мобилках открывал системное меню
  // шаринга, а на десктопе (где navigator.share почти нигде не
  // поддерживается) кнопки "Поделиться" не было вообще — только в
  // мобильной sticky-панели сверху. По ROADMAP.md (U11) нужны явные кнопки
  // Telegram/WhatsApp — основные каналы, которыми продавцы техники реально
  // договариваются о сделках, и не только на мобилке. Заменили на три
  // явных пункта, одинаковых на любом устройстве и в любом браузере: два
  // прямых диплинка в мессенджеры и копирование ссылки как универсальный
  // вариант на случай другого приложения.
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

  // "Обновлено" — намеренно НЕ updatedAt: это поле трогает вообще любой
  // update() строки в базе (архивация, снятие с архива, покупка бейджа/
  // выделения цены и т.п.), а не только реальное обновление контента, и
  // показывать его буквально означало бы "обновлено сегодня" почти всегда.
  // bumpedAt — тот же признак свежести, что уже используется для
  // сортировки каталога (COALESCE(bumped_at, created_at), см.
  // AdsService.findAll) и обновляется только платным "Поднять объявление"
  // или премиумом (в том числе автоматически раз в сутки, пока услуга
  // активна, см. AdAutoBumpWorker) — то есть ровно тогда, когда объявление
  // реально "поднялось" и должно выглядеть свежим для покупателя. Условие
  // "bumpedAt позже publishedAt" — от случая, когда объявление подняли, а
  // потом отредактировали и оно прошло повторную модерацию: publish()
  // всегда перезаписывает publishedAt текущим моментом, так что старая
  // дата подъёма может оказаться РАНЬШЕ новой даты публикации — тогда
  // "Обновлено" показывать не нужно. Сравнение отформатированных строк, а
  // не самих дат — чтобы не показывать две одинаковые на вид даты, если
  // подъём случился в тот же день, что и публикация.
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
              <Heart size={20} className={cn('transition-colors', ad.isFavorite ? 'fill-current text-red-500' : '')} />
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
                    className='relative w-full flex-shrink-0 snap-center pt-[76%] lg:pt-[66%]'
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
            <div className='relative mb-2 overflow-hidden rounded-xl bg-gray-100 pt-[76%] lg:pt-[66%]'>
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
          {/* Тот же заголовок, что и выше (desktop-версия) — на мобильных он
              визуально нужен именно здесь, но настоящий <h1> на странице
              должен быть только один (см. Heading.as), иначе поисковые
              роботы и парсеры разметки видят два одинаковых H1 в исходном
              HTML, даже если для пользователя виден всегда только один. */}
          <Heading level={1} as='p' className='mb-2 block text-lg sm:hidden'>
            {ad.title}
          </Heading>
          <div className='relative mb-4 flex items-start justify-between gap-2'>
            <p className='text-xl font-bold sm:text-2xl'>
              <span className={cn(isPriceHighlighted && AD_PRICE_HIGHLIGHT_CLASS)}>
                {ad.price ? `${ad.price.toLocaleString('ru-RU')} ₽` : 'Цена договорная'}
              </span>
              {/* ITEM ("Целиком") — цена без разбивки на единицы измерения,
                  суффикс "за X" для него не нужен (см. shared/constants/units.ts) */}
              {ad.price && ad.unit && ad.unit !== 'ITEM' && PRICE_UNITS[ad.unit] && (
                <span className='block text-sm font-normal text-gray-500'>за {PRICE_UNITS[ad.unit].toLowerCase()}</span>
              )}
            </p>
            {/* На мобилке "Поделиться" уже есть в дропдауне "..." верхней
                sticky-панели (см. выше) — здесь дублируем для десктопа,
                где той панели нет вообще. */}
            <DropdownMenu>
              {/* Та же "кнопка-обёртка 32px / иконка 20px" схема, что и у
                  FavoriteButton ниже (аудит A1+A2, ROADMAP.md) — раньше у
                  этой кнопки не было отступа вокруг иконки вообще (box =
                  icon = 20px), а у FavoriteButton уже появился, из-за чего
                  две соседние кнопки визуально разъехались по высоте.
                  right-8, а не right-7 — вплотную к 32px-боксу
                  FavoriteButton (тот сидит на right-0). */}
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
              // sm:flex, а не sm:block — база компонента центрирует иконку
              // через flex, block сломал бы это центрирование.
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

          {/* Ведёт на публичную страницу продавца (/sellers/:id) — весь
              блок кликабелен целиком, а не только текст "Ещё N
              объявлений", чтобы было легко попасть туда и с аватара/имени. */}
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
            {/* "Частное лицо" — просто самозаявленный тип, показываем всегда.
                ИП/Компания — без подтверждения ИНН это ничем не обеспеченное
                заявление продавца о себе, поэтому бейдж для них показываем,
                только когда businessVerifiedAt подтверждён через DaData (см.
                UserService.verifyBusiness), и тогда используем реальное
                название вместо общей подписи ("ИП Иванов И.И." вместо
                просто "ИП"). */}
            {ad.user?.type === UserType.Individual && (
              <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>
                {USER_TYPE_LABELS[ad.user.type]}
              </span>
            )}
            {ad.user?.type !== UserType.Individual && ad.user?.businessVerifiedAt && ad.user?.businessName && (
              <span className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>{ad.user.businessName}</span>
            )}
            {isSellerPremium && (
              <span className='flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-700'>
                <Crown size={11} />
                Премиум
              </span>
            )}
          </div>
          {/* На мобилке теперь то же самое действие есть в дропдауне "..."
              в верхней панели (см. выше, isReportDialogOpen) — эта версия
              с текстовой ссылкой становится дублем, прячем её на мобилке,
              оставляем только на десктопе. */}
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
      </div>

      {similarAds.length > 0 && (
        <div className='mt-8'>
          <SimilarAdsSection ads={similarAds} />
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
          animation={{ swipe: 0 }}
          styles={{ slide: { maxWidth: 1280, margin: '0 auto' } }}
        />
      )}
    </div>
  )
}
