'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { adsService } from '../services/ads.service'
import { IAdsListResponse } from '../types/ad.types'
import { CATALOG_PAGE_SIZE } from '../utils/build-ads-query-params'

// Пагинация («Показать ещё» в каталоге, бесконечный скролл на главной, см.
// AdsClient) — отдельно от useAds, потому что здесь нужен накапливающийся
// список страниц, а не одна перезаписываемая порция.
//
// initialFirstPage — первая страница, уже отрисованная сервером (SSR, см.
// page.tsx). Опционален: вызывающий код передаёт его, только когда уверен,
// что это данные ИМЕННО под текущие params (см. canUseInitialAds в
// ads-client.tsx) — react-query не проверяет это сам. Когда его нет
// (undefined), запрос стартует как обычный клиентский фетч первой страницы
// с нормальным isLoading — то же самое поведение, что было бы без
// initialData вообще.
//
// Глобальный staleTime (60с, см. TanstackQueryProvider) намеренно не
// трогаем общим `staleTime: 0` (как у useAds/useAd) — react-query v5 убрал
// точечный `refetch({ refetchPage })` (был в v4), и обычный refetch()
// переспрашивает ВСЕ уже подгруженные страницы целиком. На длинном списке
// это было бы накладно — но не в этот момент: эффект ниже стреляет сразу
// при маунте, а единственный способ попасть в hasNextPage/fetchNextPage —
// явное действие пользователя (скролл до сентинела/клик «Показать ещё»)
// уже ПОСЛЕ первого рендера. То есть на момент срабатывания эффекта
// вторых страниц просто физически ещё нет — refetch() затрагивает ровно
// одну, первую, страницу, никакого специального сужения не требуется.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAdsInfinite(params: Record<string, any>, initialFirstPage?: IAdsListResponse) {
  const query = useInfiniteQuery({
    queryKey: ['ads-infinite', params],
    queryFn: ({ pageParam }) => adsService.findAll({ ...params, page: pageParam, limit: CATALOG_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    initialData: initialFirstPage ? { pages: [initialFirstPage], pageParams: [1] } : undefined
  })

  const { refetch } = query

  useEffect(() => {
    // Ничего корректировать не нужно — без initialFirstPage запрос и так
    // выполнит обычный клиентский фетч сам.
    if (!initialFirstPage) return

    // SSR-фетч первой страницы всегда анонимный (нет доступа к куки
    // браузера) — isFavorite в initialFirstPage может быть некорректным
    // для авторизованного пользователя сразу после гидратации (тот же
    // фикс, что и в useAd/useAds).
    refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
