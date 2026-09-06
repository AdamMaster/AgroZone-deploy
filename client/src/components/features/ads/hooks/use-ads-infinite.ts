'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { adsService } from '../services/ads.service'
import { IAdsListResponse } from '../types/ad.types'
import { CATALOG_PAGE_SIZE } from '../utils/build-ads-query-params'

// Пагинация каталога («Показать ещё») — отдельно от useAds (см. там же),
// потому что здесь нужен накапливающийся список страниц, а не одна
// перезаписываемая порция. initialFirstPage ОБЯЗАТЕЛЕН (не опционален) —
// первая страница всегда приходит с сервера (SSR, см. page.tsx), точно так
// же, как initialData сделан обязательным у useAd (см. комментарий там же)
// — честнее отразить это в типе, чем разрешать `| undefined` без
// необходимости.
//
// Глобальный staleTime (60с, см. TanstackQueryProvider) — уже ровно то, что
// нужно: не даёт react-query сразу же перезапросить первую страницу поверх
// initialData при монтировании, но и не держит её "неактуальной" вечно.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAdsInfinite(params: Record<string, any>, initialFirstPage: IAdsListResponse) {
  const query = useInfiniteQuery({
    queryKey: ['ads-infinite', params],
    queryFn: ({ pageParam }) => adsService.findAll({ ...params, page: pageParam, limit: CATALOG_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    initialData: { pages: [initialFirstPage], pageParams: [1] }
  })

  const ads = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data])
  const total = query.data?.pages[0]?.total ?? 0

  return {
    ads,
    total,
    isLoadingAds: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage
  }
}
