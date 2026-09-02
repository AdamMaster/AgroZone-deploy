'use client'

import { useHomeLocationStore } from '@/store'

import { AdsClient } from '@/components/features/ads/components'

export const HomeAdsFeed = () => {
  const { location } = useHomeLocationStore()

  return (
    <AdsClient
      locationOverride={{
        regionIsoCode: location.regionIsoCode,
        localityFiasId: location.localityFiasId
      }}
    />
  )
}
