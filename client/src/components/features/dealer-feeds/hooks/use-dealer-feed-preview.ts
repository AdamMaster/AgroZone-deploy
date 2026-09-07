'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsService } from '../services'

// Предпросмотр — по кнопке, а не автозагрузка при открытии страницы:
// это сетевой запрос, который сам может занять время на большом фиде
// (см. DealerFeedParserService на бэкенде), незачем гонять его при каждом
// заходе в личный кабинет.
export function useDealerFeedPreview() {
  const {
    mutate: runPreview,
    data: preview,
    isPending: isLoadingPreview,
    reset: resetPreview
  } = useMutation({
    mutationKey: ['dealer-feed-preview'],
    mutationFn: () => dealerFeedsService.previewMine(),
    onError: toastMessageHandler
  })

  return { runPreview, preview, isLoadingPreview, resetPreview }
}
