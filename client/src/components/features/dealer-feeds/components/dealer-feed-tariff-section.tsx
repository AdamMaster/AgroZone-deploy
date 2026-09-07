'use client'

import { useState } from 'react'

import { Button, Heading } from '@/components/ui'

import { cn } from '@/lib/utils'

import { DEALER_TIER_LABELS, DEALER_TIER_ORDER, DEALER_TIER_PRICE_RUB } from '../constants/dealer-tier.constants'
import { useDealerSubscriptionCheckout } from '../hooks'
import { DealerTier, IDealerFeed } from '../types/dealer-feed.types'

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

interface DealerFeedTariffSectionProps {
  dealerFeed: IDealerFeed
}

// Тариф — отдельная платная сущность от обычного "Премиум" (см.
// обсуждение с владельцем: другая аудитория, другая ценность — массовый
// автоматический импорт каталога, а не буст собственного объявления).
// Без действующего тарифа синхронизация фида не запускается вообще, даже
// если фид уже одобрен админом (см. DealerFeedSyncService.syncOne на
// бэкенде) — этот блок ровно об этом предупреждает.
export const DealerFeedTariffSection = ({ dealerFeed }: DealerFeedTariffSectionProps) => {
  const [selectedTier, setSelectedTier] = useState<DealerTier>('UP_TO_20')
  const { startSubscriptionCheckout, isStartingSubscriptionCheckout } = useDealerSubscriptionCheckout()

  const isActive = !!dealerFeed.subscriptionTier && !!dealerFeed.subscriptionUntil && new Date(dealerFeed.subscriptionUntil) > new Date()

  return (
    <div className='rounded-xl bg-gray-50 p-6'>
      <Heading level={4} className='mb-1 font-medium'>
        Тариф
      </Heading>

      {isActive ? (
        <p className='mb-4 text-sm text-gray-600'>
          Активен план «{DEALER_TIER_LABELS[dealerFeed.subscriptionTier as DealerTier]}» до{' '}
          {formatDate(dealerFeed.subscriptionUntil as string)}. Без действующего тарифа синхронизация фида не идёт.
        </p>
      ) : (
        <p className='mb-4 text-sm text-gray-600'>
          Без оплаченного тарифа синхронизация фида не запустится, даже если он уже одобрен. Выберите план по объёму
          каталога.
        </p>
      )}

      <div className='mb-4 flex flex-col gap-2 sm:flex-row'>
        {DEALER_TIER_ORDER.map(tier => (
          <button
            key={tier}
            type='button'
            onClick={() => setSelectedTier(tier)}
            className={cn(
              'flex-1 rounded-lg border px-4 py-3 text-left transition-colors',
              selectedTier === tier ? 'border-primary bg-white' : 'border-gray-200 hover:bg-white'
            )}
          >
            <p className='text-sm font-medium'>{DEALER_TIER_LABELS[tier]}</p>
            <p className='text-sm text-gray-500'>{DEALER_TIER_PRICE_RUB[tier]} ₽ / 30 дней</p>
          </button>
        ))}
      </div>

      <Button
        onClick={() => startSubscriptionCheckout(selectedTier)}
        disabled={isStartingSubscriptionCheckout}
        className='bg-orange-400 hover:bg-orange-500'
      >
        {isActive ? 'Сменить тариф' : 'Оформить тариф'}
      </Button>
    </div>
  )
}
