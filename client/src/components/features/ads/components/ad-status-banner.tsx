import { cn } from '@/lib/utils'

import { IAd } from '../types/ad.types'

type AdStatus = IAd['status']

interface BannerContent {
  title: string
  description: string
  tone: 'neutral' | 'warning' | 'danger'
}

const TONE_CLASS_NAMES: Record<BannerContent['tone'], string> = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-200',
  warning: 'bg-orange-100 text-orange-900 dark:bg-orange-200 dark:text-neutral-900',
  danger: 'bg-red-100 text-red-600'
}

const REJECTED_FALLBACK_REASON = 'Объявление не прошло модерацию. Исправьте его и отправьте на проверку повторно.'

const BANNER_CONTENT: Partial<Record<AdStatus, BannerContent>> = {
  DRAFT: {
    title: 'Черновик',
    description: 'Объявление не опубликовано и видно только вам. Опубликуйте его, когда будете готовы.',
    tone: 'neutral'
  },
  PENDING: {
    title: 'На модерации',
    description:
      'Мы проверяем объявление на соответствие правилам площадки. Обычно это занимает около 15 минут, но в отдельных случаях может занять до 24 часов.',
    tone: 'warning'
  },
  REJECTED: {
    title: 'Отклонено модератором',
    description: REJECTED_FALLBACK_REASON,
    tone: 'danger'
  },
  ARCHIVED: {
    title: 'В архиве',
    description:
      'Объявление снято с публикации и скрыто от покупателей. В архиве оно хранится 30 дней, затем удаляется автоматически.',
    tone: 'neutral'
  },
  EXPIRED: {
    title: 'Срок размещения истёк',
    description: 'Объявление скрыто от покупателей. Опубликуйте его снова, чтобы оно вернулось в каталог.',
    tone: 'warning'
  }
}

interface AdStatusBannerProps {
  status: AdStatus
  // Причина отказа модератора — показывается вместо общего текста для REJECTED.
  rejectionReason?: string
  className?: string
}

// Плашка со статусом неопубликованного объявления на странице просмотра
// владельца. Для PUBLISHED плашки нет — это обычное публичное состояние.
export const AdStatusBanner = ({ status, rejectionReason, className }: AdStatusBannerProps) => {
  const content = BANNER_CONTENT[status]

  if (!content) return null

  return (
    <div role='status' className={cn('rounded-xl px-4 py-3', TONE_CLASS_NAMES[content.tone], className)}>
      <p className='font-medium'>{content.title}</p>
      <p className='mt-0.5 text-sm'>
        {status === 'REJECTED' && rejectionReason ? rejectionReason : content.description}
      </p>
    </div>
  )
}
