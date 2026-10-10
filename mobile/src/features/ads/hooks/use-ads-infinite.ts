import { type InfiniteData, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { uniqueById } from '@/shared/utils/unique-by-id'

import { adsApi } from '../api/ads.api'
import type { AdsFilters, AdsListResponse } from '../types/ad.types'

// Тот же размер страницы, что в каталоге сайта (CATALOG_PAGE_SIZE). Сервер
// всё равно режет limit до 50.
const PAGE_SIZE = 20

// Все выдачи объявлений лежат под этим префиксом — по нему избранное
// обновляет отметку «в избранном» сразу во всех лентах и каталогах.
export const adsListQueryKeyPrefix = ['ads', 'list'] as const

export const adsListQueryKey = (filters: AdsFilters) => [...adsListQueryKeyPrefix, filters] as const

export type AdsListData = InfiniteData<AdsListResponse, number>

// Бесконечная выдача объявлений — лента главной и каталог (с категорией,
// поиском, сортировкой).
//
// filters должен быть стабильным объектом (константа или useMemo у
// вызывающего): от него зависит ключ запроса. enabled: false — условия ещё
// не готовы (например, каталог ждёт дерево категорий, чтобы узнать id).
export function useAdsInfinite(filters: AdsFilters, { enabled = true }: { enabled?: boolean } = {}) {
  const queryKey = useMemo(() => adsListQueryKey(filters), [filters])

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => adsApi.fetchAds({ page: pageParam, limit: PAGE_SIZE, signal, filters }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    enabled
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
    queryClient.setQueryData<AdsListData>(queryKey, data =>
      data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data
    )

    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient, refetch, queryKey])

  const ads = useMemo(() => uniqueById(query.data?.pages.map(page => page.items) ?? []), [query.data])

  // Возвращаем поля явно, а не `...query`: react-query отслеживает, какие
  // поля результата прочитал компонент, и перерисовывает его только при их
  // изменении. Спред читает все поля сразу и выключает эту оптимизацию.
  return {
    ads,
    total: query.data?.pages[0]?.total ?? 0,
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
