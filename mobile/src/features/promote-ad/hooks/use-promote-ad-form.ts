import { useState } from 'react'

import type { AdBadge } from '@/features/ads/types/ad.types'

import { AD_SERVICE_PRICES_KOPECKS, DEFAULT_AD_BADGE } from '../constants/ad-services'
import type { AdServiceCheckoutParams, AdServiceType } from '../types/promote-ad.types'

// Выбор услуг на странице «Поднять просмотры»: какие включены, какой значок
// и сколько получается в итоге. Правила — как на сайте.
export function usePromoteAdForm(currentBadge: AdBadge | null | undefined) {
  const [selected, setSelected] = useState<ReadonlySet<AdServiceType>>(new Set())
  const [selectedBadge, setSelectedBadge] = useState<AdBadge | undefined>(undefined)

  const toggle = (service: AdServiceType) => {
    const next = new Set(selected)

    if (next.has(service)) {
      next.delete(service)
      if (service === 'BADGE') setSelectedBadge(undefined)
    } else {
      next.add(service)
      // Значок предлагается сразу: прежний значок объявления или «Срочно».
      if (service === 'BADGE' && !selectedBadge) setSelectedBadge(currentBadge ?? DEFAULT_AD_BADGE)
    }

    setSelected(next)
  }

  const totalKopecks = [...selected].reduce((sum, service) => sum + AD_SERVICE_PRICES_KOPECKS[service], 0)
  // Выбран значок как услуга, но не выбран его вид — оплачивать рано.
  const isComplete = selected.size > 0 && !(selected.has('BADGE') && !selectedBadge)

  const params: AdServiceCheckoutParams = {
    services: [...selected],
    badge: selected.has('BADGE') ? selectedBadge : undefined
  }

  return { selected, selectedBadge, setSelectedBadge, toggle, totalKopecks, isComplete, params }
}
