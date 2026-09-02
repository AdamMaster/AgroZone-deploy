'use client'

import { ArrowUp, Crown, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  Button,
  ButtonBack,
  Heading,
  Loading,
  Skeleton,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui'

import { useProfile } from '@/shared/hooks'
import { isFutureDate } from '@/shared/utils'

import { cn } from '@/lib/utils'

import {
  AD_BADGE_LABELS,
  AD_BADGE_LIST,
  AD_PRICE_HIGHLIGHT_CLASS,
  AD_SERVICE_DESCRIPTIONS,
  AD_SERVICE_LABELS,
  AD_SERVICE_PRICES_KOPECKS
} from '../constants/ad-services.constants'
import { useAdServicesCheckout, useMyAd } from '../hooks'
import { AdBadge, AdServiceType } from '../types/ad.types'
import { AdBadgeChip } from './ad-badge-chip'

interface PromoteAdProps {
  id: string
}

const SERVICES: AdServiceType[] = ['BUMP', 'PRICE_HIGHLIGHT', 'BADGE']

const formatDate = (value: Date | string) => {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value))
}

export const PromoteAd = ({ id }: PromoteAdProps) => {
  const router = useRouter()
  const { user } = useProfile()
  const { ad, isLoading: isLoadingAd } = useMyAd(id)
  const { checkout, isLoadingCheckout } = useAdServicesCheckout(id)

  const [selectedServices, setSelectedServices] = useState<Set<AdServiceType>>(new Set())
  const [selectedBadge, setSelectedBadge] = useState<AdBadge | undefined>(undefined)

  if (isLoadingAd || !ad) return <Loading />

  const isOwnerPremiumActive = !!user?.premiumUntil && new Date(user.premiumUntil) > new Date()
  const PREMIUM_COVERED_SERVICES: AdServiceType[] = ['BUMP', 'PRICE_HIGHLIGHT']

  const toggleService = (service: AdServiceType) => {
    setSelectedServices(prev => {
      const next = new Set(prev)
      if (next.has(service)) {
        next.delete(service)
        if (service === 'BADGE') setSelectedBadge(undefined)
      } else {
        next.add(service)
        if (service === 'BADGE' && !selectedBadge) {
          setSelectedBadge((ad.badge as AdBadge | null) ?? 'URGENT')
        }
      }
      return next
    })
  }

  const totalKopecks = Array.from(selectedServices).reduce(
    (sum, service) => sum + AD_SERVICE_PRICES_KOPECKS[service],
    0
  )

  const canSubmit =
    selectedServices.size > 0 && !(selectedServices.has('BADGE') && !selectedBadge) && !isLoadingCheckout

  const onSubmit = () => {
    if (!canSubmit) return

    checkout({
      services: Array.from(selectedServices),
      badge: selectedServices.has('BADGE') ? selectedBadge : undefined
    })
  }

  if (ad.status !== 'PUBLISHED') {
    return (
      <div className='max-w-[600px] rounded-xl border p-8 text-center'>
        <Heading level={2} className='mb-2'>
          Услуги продвижения недоступны
        </Heading>
        <p className='mb-6 text-gray-500'>
          Продвигать можно только опубликованные объявления. Сначала опубликуйте объявление, затем возвращайтесь сюда.
        </p>
        <Button variant='outline' onClick={() => router.push(`/ads/${ad.id}/edit`)}>
          К объявлению
        </Button>
      </div>
    )
  }

  const previewBadge = selectedServices.has('BADGE')
    ? selectedBadge
    : isFutureDate(ad.badgeUntil) && ad.badge
      ? ad.badge
      : undefined
  const previewPriceHighlighted =
    selectedServices.has('PRICE_HIGHLIGHT') || isFutureDate(ad.priceHighlightUntil) || isOwnerPremiumActive
  const previewBumped = selectedServices.has('BUMP') || isFutureDate(ad.bumpServiceUntil) || isOwnerPremiumActive

  return (
    <div className='relative max-w-[1040px]'>
      <ButtonBack className='absolute top-0 -left-18' onClick={() => router.back()} />
      <Heading level={1} className='mb-1'>
        Поднять просмотры
      </Heading>
      <p className='mb-8 text-gray-500'>
        Выберите нужные услуги — они действуют 7 дней, оплата одним платежом за весь выбранный набор.
      </p>

      <div className='grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]'>
        <div className='flex flex-col gap-3'>
          {SERVICES.map(service => {
            const disabled = PREMIUM_COVERED_SERVICES.includes(service) && isOwnerPremiumActive
            const checked = selectedServices.has(service)

            const activeUntil =
              service === 'BUMP'
                ? ad.bumpServiceUntil
                : service === 'PRICE_HIGHLIGHT'
                  ? ad.priceHighlightUntil
                  : ad.badgeUntil

            return (
              <div key={service} className='custom-shadow rounded-xl p-4'>
                <div className='flex items-center justify-between gap-4'>
                  <div>
                    <p className='font-medium'>{AD_SERVICE_LABELS[service]}</p>
                    <p className='text-sm text-gray-500'>{AD_SERVICE_DESCRIPTIONS[service]}</p>
                    {service === 'BADGE' && isFutureDate(ad.badgeUntil) && ad.badge && (
                      <p className='mt-1 text-xs text-amber-600'>
                        Сейчас активен: {AD_BADGE_LABELS[ad.badge]} — до {formatDate(ad.badgeUntil as Date | string)}
                      </p>
                    )}
                    {service !== 'BADGE' && isFutureDate(activeUntil) && (
                      <p className='mt-1 text-xs text-amber-600'>
                        Уже активно до {formatDate(activeUntil as Date | string)}
                      </p>
                    )}
                  </div>

                  <div className='flex flex-shrink-0 items-center gap-3'>
                    <span className='text-sm font-medium whitespace-nowrap'>
                      {(AD_SERVICE_PRICES_KOPECKS[service] / 100).toLocaleString('ru-RU')} ₽
                    </span>
                    {disabled ? (
                      <Tooltip>
                        <TooltipTrigger className='flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700'>
                          <Crown className='size-3.5' />
                          Включено в премиум
                        </TooltipTrigger>
                        <TooltipContent>
                          Премиум-аккаунт уже включает эту услугу для всех ваших объявлений — покупать отдельно не
                          нужно.
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Switch checked={checked} onCheckedChange={() => toggleService(service)} />
                    )}
                  </div>
                </div>

                {service === 'BADGE' && checked && (
                  <div className='mt-4 flex flex-wrap gap-2 border-t pt-4'>
                    {AD_BADGE_LIST.map(badge => (
                      <button
                        key={badge}
                        type='button'
                        onClick={() => setSelectedBadge(badge)}
                        className={cn(
                          'rounded-full bg-gray-100 px-3 py-1.5 text-sm transition-colors',
                          selectedBadge === badge ? 'bg-secondary text-white' : 'text-gray-700'
                        )}
                      >
                        {AD_BADGE_LABELS[badge]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className='flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start'>
          <div className='custom-shadow rounded-xl p-4'>
            <p className='mb-3 text-xs font-medium text-gray-500'>Так будет выглядеть объявление</p>
            <div className='relative mb-3 overflow-hidden rounded-lg bg-gray-100 pt-[75%]'>
              {ad.images.length > 0 ? (
                <Image src={ad.images[0]} alt={ad.title} className='h-full w-full object-cover' fill sizes='280px' />
              ) : (
                <ImageIcon size={40} className='absolute top-1/2 left-1/2 -translate-1/2 text-gray-400' />
              )}
              {previewBadge && <AdBadgeChip badge={previewBadge} className='absolute top-1 left-1' />}
            </div>
            <Skeleton className='mb-1.5 h-3.5 w-full' />
            <Skeleton className='mb-3 h-3.5 w-2/3' />
            <p className={cn('w-fit text-lg font-bold', previewPriceHighlighted && AD_PRICE_HIGHLIGHT_CLASS)}>
              {ad.price ? `${ad.price.toLocaleString('ru-RU')} ₽` : 'Цена договорная'}
            </p>
            {previewBumped && (
              <p className='mt-2 flex items-center gap-1 text-xs text-amber-600'>
                <ArrowUp size={12} />
                Будет выше в поиске
              </p>
            )}
          </div>

          <div className='rounded-xl bg-gray-100 p-4'>
            <p className='text-sm text-gray-500'>Итого</p>
            <p className='mb-3 text-xl font-bold'>{(totalKopecks / 100).toLocaleString('ru-RU')} ₽</p>
            <Button className='w-full' size='lg' disabled={!canSubmit} onClick={onSubmit}>
              {isLoadingCheckout ? 'Переход к оплате...' : 'Оплатить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
