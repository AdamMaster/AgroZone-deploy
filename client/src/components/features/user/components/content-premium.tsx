'use client'

import { Check, Crown } from 'lucide-react'

import { Button, Heading, Skeleton } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { usePremiumCheckout } from '../hooks/use-premium-checkout'
import { PremiumStatusHandler } from './premium-status-handler'

const PREMIUM_PRICE_LABEL = '1499 ₽ за 30 дней'

// ВАЖНО: сейчас реально работают (завязаны на premiumUntil) "До 15 фото"
// (см. AdsService.validateFileLimits) и "Автоматический подъём объявлений"
// (см. AdAutoBumpWorker + PremiumService.reconcilePayment — при покупке
// premium сразу поднимает все опубликованные объявления, дальше держит их
// свежими всё время, пока premium активен). Бейдж «Премиум» и
// автовыделение — пока НЕ реализованы технически (план — см.
// agro-zone-monetization-plan.md). Скидка на «Поднять объявление» тоже не
// реализована и, возможно, вообще не нужна: премиум-пользователям кнопка
// "Поднять объявление" теперь просто не показывается (см. AdShortCard) —
// им нечего покупать со скидкой, объявления и так поднимаются бесплатно.
// Показывать нереализованные пункты здесь до реализации — осознанный
// маркетинговый риск (по сути обещание того, что покупатель сегодня не
// получит), поэтому либо доделать функциональность в первую очередь, либо
// явно пометить эти пункты как "скоро" на странице.
const BENEFITS = [
  {
    title: 'До 15 фото к объявлению',
    description: 'Вместо 5 — покажите технику или животных со всех сторон'
  },
  {
    title: 'Выделенное объявление',
    description: 'Все ваши объявления автоматически подсвечиваются в каталоге и списках'
  },
  {
    title: 'Бейдж «Премиум»',
    description: 'Отмечает вас как надёжного продавца рядом с именем в объявлениях и профиле'
  },
  {
    title: 'Скидка на «Поднять объявление»',
    description: 'Дешевле поднимать объявления в поиске, пока активен премиум'
  },
  {
    title: 'Автоматический подъём объявлений',
    description: 'Объявления сами поднимаются в поиске — без ручных действий и доплат'
  }
]

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))
}

export const ContentPremium = () => {
  const { user, isLoading } = useProfile()
  const { startPremiumCheckout, isStartingPremiumCheckout } = usePremiumCheckout()

  const isPremiumActive = !!user?.premiumUntil && new Date(user.premiumUntil) > new Date()

  return (
    <div>
      <PremiumStatusHandler />

      <Heading level={2} className='mb-6'>
        Премиум Аккаунт
      </Heading>

      {isLoading ? (
        <Skeleton className='h-48 w-full max-w-md rounded-xl' />
      ) : isPremiumActive ? (
        <div className='max-w-md rounded-2xl bg-gray-100 p-8'>
          <div className='mb-1.5 flex items-center gap-2'>
            <Heading level={4} className='font-medium'>
              Премиум активен
            </Heading>
            <Crown className='size-5 fill-orange-500 text-orange-500' />
          </div>
          <p className='mb-7 text-sm'>Действует до {formatDate(user!.premiumUntil as string)}</p>
          <Button
            variant='default'
            className='border-0 px-4'
            onClick={() => startPremiumCheckout()}
            disabled={isStartingPremiumCheckout}
          >
            Продлить ещё на 30 дней — {PREMIUM_PRICE_LABEL}
          </Button>
        </div>
      ) : (
        <div className='max-w-md rounded-xl bg-gray-50 p-6'>
          <p className='mb-4 text-2xl font-bold'>{PREMIUM_PRICE_LABEL}</p>
          <ul className='mb-6 flex flex-col gap-2'>
            {BENEFITS.map(benefit => (
              <li key={benefit.title} className='flex items-start gap-2 text-gray-700'>
                <Check className='text-primary mt-0.5 size-4 flex-shrink-0' strokeWidth={3} />
                <div>
                  <p className='text-sm font-medium'>{benefit.title}</p>
                  {benefit.description && <p className='text-xs text-gray-500'>{benefit.description}</p>}
                </div>
              </li>
            ))}
          </ul>
          <Button
            size='lg'
            className='bg-orange-400 px-5 hover:bg-orange-500'
            onClick={() => startPremiumCheckout()}
            disabled={isStartingPremiumCheckout}
          >
            Оформить премиум
          </Button>
        </div>
      )}
    </div>
  )
}
