import { Text, View } from 'react-native'

import type { AdStatus } from '@/features/my-ads/types/my-ad.types'

type Tone = 'neutral' | 'warning' | 'danger'

interface BannerContent {
  title: string
  description: string
  tone: Tone
}

const TONE_CLASSES: Record<Tone, { container: string; text: string }> = {
  neutral: { container: 'bg-gray-100 dark:bg-neutral-700', text: 'text-gray-700 dark:text-gray-200' },
  warning: { container: 'bg-orange-100 dark:bg-orange-200', text: 'text-orange-900 dark:text-neutral-900' },
  danger: { container: 'bg-red-100', text: 'text-red-600' }
}

// Тексты — как у AdStatusBanner сайта.
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
    description: 'Объявление не прошло модерацию. Исправьте его и отправьте на проверку повторно.',
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
  rejectionReason: string | null
}

// Плашка статуса неопубликованного объявления — видит только владелец.
export function AdStatusBanner({ status, rejectionReason }: AdStatusBannerProps) {
  const content = BANNER_CONTENT[status]
  if (!content) return null

  const tone = TONE_CLASSES[content.tone]

  return (
    <View accessibilityRole='summary' className={`rounded-xl px-4 py-3 ${tone.container}`}>
      <Text className={`font-medium ${tone.text}`}>{content.title}</Text>
      <Text className={`mt-0.5 text-sm ${tone.text}`}>
        {status === 'REJECTED' && rejectionReason ? rejectionReason : content.description}
      </Text>
    </View>
  )
}
