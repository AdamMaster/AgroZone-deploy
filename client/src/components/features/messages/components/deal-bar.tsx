'use client'

import { CircleCheck } from 'lucide-react'

import { useSiteFlags } from '@/components/features/site-settings/hooks'
import { Button } from '@/components/ui'

import { useSetDeal } from '../hooks'
import { IConversationListItem } from '../types/message.types'

const formatDealDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value))

interface DealBarProps {
  conversation: Pick<IConversationListItem, 'id' | 'isSeller' | 'canConfirmDeal' | 'dealConfirmedAt'>
}

// Отметка «сделка состоялась» над перепиской. Ставит её только продавец, и
// только после своего ответа покупателю (см. canConfirmDeal); покупатель
// видит результат. Подсказку про отзыв показываем, лишь когда рейтинги
// продавцов включены в админке — иначе обещать отзыв нечем.
export const DealBar = ({ conversation }: DealBarProps) => {
  const { id, isSeller, canConfirmDeal, dealConfirmedAt } = conversation
  const { sellerRatings } = useSiteFlags()
  const { setDeal, isSettingDeal } = useSetDeal(id)

  if (dealConfirmedAt) {
    return (
      <div className='mt-2 flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm'>
        <CircleCheck className='text-primary size-5 shrink-0' />
        <p className='min-w-0 flex-1'>
          {isSeller ? 'Вы отметили сделку состоявшейся' : 'Продавец отметил сделку состоявшейся'}
          <span className='block text-xs text-gray-500'>
            {formatDealDate(dealConfirmedAt)}
            {!isSeller && sellerRatings && ' · теперь вы можете оставить отзыв'}
          </span>
        </p>
        {isSeller && (
          <Button type='button' variant='ghost' size='sm' disabled={isSettingDeal} onClick={() => setDeal(false)}>
            Отменить
          </Button>
        )}
      </div>
    )
  }

  // Кнопка появляется, когда продавец сам ответил покупателю.
  if (!isSeller || !canConfirmDeal) return null

  return (
    <div className='mt-2 flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-sm'>
      <p className='min-w-0 flex-1'>Сделка с этим покупателем состоялась?</p>
      <Button type='button' size='sm' disabled={isSettingDeal} onClick={() => setDeal(true)}>
        Сделка состоялась
      </Button>
    </div>
  )
}
