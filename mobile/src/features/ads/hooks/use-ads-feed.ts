import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { adsApi } from '../api/ads.api'
import type { AdListItem, AdsListResponse } from '../types/ad.types'

// Тот же размер страницы, что в каталоге сайта (CATALOG_PAGE_SIZE). Сервер
// всё равно режет limit до 50.
const FEED_PAGE_SIZE = 20

export const adsFeedQueryKey = ['ads', 'feed'] as const

export function useAdsFeed() {
  const query = useInfiniteQuery({
    queryKey: adsFeedQueryKey,
    queryFn: ({ pageParam, signal }) => adsApi.fetchAds({ page: pageParam, limit: FEED_PAGE_SIZE, signal }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined)
  })

  const queryClient = useQueryClient()
  const { refetch } = query

  // Pull-to-refresh: обычный refetch() у бесконечного запроса последовательно
  // перезапрашивает ВСЕ загруженные страницы — после долгого скролла это
  // десятки запросов и долгое ожидание. Пользователь, потянувший ленту вниз,
  // хочет увидеть свежий верх, поэтому сначала оставляем только первую
  // страницу, а потом обновляем её одну.
  //
  // Свой флаг вместо query.isRefetching: тот true и при фоновом обновлении
  // (вернулись в приложение), а крутилку pull-to-refresh нужно показывать
  // только когда пользователь сам потянул ленту.
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    queryClient.setQueryData<InfiniteData<AdsListResponse, number>>(adsFeedQueryKey, data =>
      data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data
    )

    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient, refetch])

  // Пагинация на сервере — по смещению (page/limit). Если между загрузкой
  // страниц кто-то опубликовал объявление, выдача сдвигается, и последнее
  // объявление предыдущей страницы приходит ещё раз первым на следующей.
  // Дубли убираем: в списке ключ элемента — id, повтор ключа ломает
  // переиспользование ячеек FlashList.
  const ads = useMemo(() => {
    const seen = new Set<string>()
    const result: AdListItem[] = []

    for (const page of query.data?.pages ?? []) {
      for (const ad of page.items) {
        if (seen.has(ad.id)) continue
        seen.add(ad.id)
        result.push(ad)
      }
    }

    return result
  }, [query.data])

  // Возвращаем поля явно, а не `...query`: react-query отслеживает, какие
  // поля результата прочитал компонент, и перерисовывает его только при их
  // изменении. Спред читает все поля сразу и выключает эту оптимизацию.
  return {
    ads,
    refresh,
    error: query.error,
    isPending: query.isPending,
    isError: query.isError,
    isFetchNextPageError: query.isFetchNextPageError,
    isRefetchError: query.isRefetchError,
    isRefreshing,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch
  }
}
