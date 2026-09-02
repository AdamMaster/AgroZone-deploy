'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services'

// Отдельный ключ кэша ('ad-moderation') от публичного ('ad-public') и
// владельческого ('ad') — см. use-ad.ts/use-my-ad.ts для объяснения, почему
// эти кэши нельзя смешивать: тут третий, ещё один набор прав доступа и
// полей (email/телефон продавца открыты напрямую, статус не ограничен
// PUBLISHED). usePublishAd/useRejectAd инвалидируют весь префикс
// ['ad-moderation'] при publish/reject — см. эти хуки.
export function useModerationAd(id: string) {
  const { data: ad, isLoading } = useQuery({
    queryKey: ['ad-moderation', id],
    queryFn: () => adsService.findOneForModeration(id),
    enabled: !!id
  })

  return { ad, isLoading }
}
