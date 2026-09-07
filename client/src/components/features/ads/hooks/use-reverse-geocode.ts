'use client'

import { useMutation } from '@tanstack/react-query'

import { adsService } from '../services'

// Разовый вызов по клику (не завязан на автоматический рефетч/queryKey),
// поэтому mutation, а не query — тот же приём, что и у
// useDealerFeedPreview (dealer-feeds/hooks) для похожего "прогнать
// по требованию и получить результат" сценария. Без onError/toast —
// вызывающая сторона (RadiusFilter) сама решает, что показать при
// неудаче: тут это только подпись для чипа, а не блокирующая ошибка.
export function useReverseGeocode() {
  const { mutateAsync: reverseGeocode, isPending: isReverseGeocoding } = useMutation({
    mutationKey: ['ads-reverse-geocode'],
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => adsService.getAddressFromCoords(lat, lng)
  })

  return { reverseGeocode, isReverseGeocoding }
}
