'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import { ButtonBack, Heading, Skeleton } from '@/components/ui'

import { useAdCounters } from '../hooks'

// Отдельный роут статистики — recharts незачем держать в основном чанке
// страницы объявления, откуда сюда переходят по клику.
const AdViewsStats = dynamic(() => import('./ad-views-stats').then(mod => mod.AdViewsStats), {
  ssr: false,
  loading: () => <Skeleton className='h-[280px] w-full rounded-xl' />
})

interface AdStatsProps {
  adId: string
}

export const AdStats = ({ adId }: AdStatsProps) => {
  const router = useRouter()
  const { counters } = useAdCounters(adId)

  return (
    <div className='max-w-[700px]'>
      <div className='-mx-4 mb-6 flex w-auto items-center gap-3'>
        <ButtonBack onClick={() => router.back()} />
        <Heading level={2}>Статистика объявления</Heading>
      </div>
      <AdViewsStats adId={adId} />
      {counters && (
        <div className='mb-6 flex gap-6 text-sm text-gray-500 dark:text-gray-400'>
          <span>
            Всего просмотров:{' '}
            <span className='font-medium text-gray-900 dark:text-white'>
              {counters.viewsTotal}
              {counters.viewsToday > 0 && <span className='text-primary font-medium'> (+{counters.viewsToday})</span>}
            </span>
          </span>
          <span>
            В избранном: <span className='font-medium text-gray-900 dark:text-white'>{counters.favoritesCount}</span>
          </span>
        </div>
      )}
    </div>
  )
}
