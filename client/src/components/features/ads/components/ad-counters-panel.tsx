'use client'

import { ChevronRight, Eye, Heart } from 'lucide-react'
import Link from 'next/link'

import { useAdCounters } from '../hooks'

interface AdCountersPanelProps {
  adId: string
}

// Компактная панель счётчиков над фото объявления (владелец) — общее число
// просмотров + прирост за сегодня, число в избранном, ссылка на подробную
// статистику (см. ad-stats.tsx). Пока counters не загрузились — не
// показываем панель вообще, а не скелетон, чтобы не дёргать layout.
export const AdCountersPanel = ({ adId }: AdCountersPanelProps) => {
  const { counters } = useAdCounters(adId)

  if (!counters) return null

  return (
    <Link
      href={`/ads/${adId}/stats`}
      className='mb-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors'
    >
      <div className='flex items-center gap-4 text-sm'>
        <span className='flex items-center gap-1.5'>
          <Eye size={16} className='text-gray-500' />
          {counters.viewsTotal}
          {counters.viewsToday > 0 && <span className='text-primary font-medium'>+{counters.viewsToday}</span>}
        </span>
        <span className='flex items-center gap-1.5'>
          <Heart size={16} className='text-gray-500' />
          {counters.favoritesCount}
        </span>
      </div>
      <span className='flex items-center gap-1 text-sm text-gray-500'>
        Статистика
        <ChevronRight size={16} />
      </span>
    </Link>
  )
}
