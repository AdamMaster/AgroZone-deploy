import { cn } from '@/lib/utils'

import { AD_BADGE_LABELS, AD_BADGE_STYLES } from '../constants/ad-services.constants'
import { AdBadge } from '../types/ad.types'

interface AdBadgeChipProps {
  badge: AdBadge
  className?: string
}

export const AdBadgeChip = ({ badge, className }: AdBadgeChipProps) => {
  return (
    <span
      className={cn('rounded-2xl rounded-tr-2xl px-2.5 py-1 text-xs font-medium', AD_BADGE_STYLES[badge], className)}
    >
      {AD_BADGE_LABELS[badge]}
    </span>
  )
}
