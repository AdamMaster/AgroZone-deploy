'use client'

import { useHomeLocationStore } from '@/store'

import { AdsClient } from '@/components/features/ads/components'
import { IAdsListResponse } from '@/components/features/ads/types/ad.types'

interface HomeAdsFeedProps {
  // Первая страница ленты, отрисованная сервером (см. page.tsx) — тот же
  // пустой (без фильтров/категории/региона) запрос, что соберёт здесь
  // AdsClient сам. Нужна, чтобы LCP-фото было в исходном HTML документа
  // (S6 в ROADMAP.md), а не появлялось только после клиентского фетча.
  initialAds: IAdsListResponse
}

export const HomeAdsFeed = ({ initialAds }: HomeAdsFeedProps) => {
  const { location } = useHomeLocationStore()

  return (
    <AdsClient
      locationOverride={{
        regionIsoCode: location.regionIsoCode,
        localityFiasId: location.localityFiasId
      }}
      initialAds={initialAds}
    />
  )
}
