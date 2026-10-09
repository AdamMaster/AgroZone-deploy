import type { AdBadge } from '../types/ad.types'

// Подписи и цвета значков объявления — как AD_BADGE_LABELS/AD_BADGE_STYLES
// на сайте (client/src/components/features/ads/constants/ad-services.constants.ts).
export const AD_BADGE_LABELS: Readonly<Record<AdBadge, string>> = {
  URGENT: 'Срочно',
  NEGOTIABLE: 'Торг уместен',
  NEW: 'Новинка'
}

// Фон и цвет текста раздельно: в React Native цвет текста задаётся на <Text>,
// а не наследуется от контейнера, как в вебе.
export const AD_BADGE_STYLES: Readonly<Record<AdBadge, { container: string; text: string }>> = {
  URGENT: { container: 'bg-red-500', text: 'text-white' },
  NEGOTIABLE: { container: 'bg-blue-400', text: 'text-white' },
  NEW: { container: 'bg-lime-300', text: 'text-neutral-900' }
}
