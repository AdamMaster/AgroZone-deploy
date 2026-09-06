'use client'

import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui'

import { pluralizeRu } from '@/shared/utils'

import { findCategoryIdBySlug } from '@/components/features/categories/utils/category-utils'

import { useCategories } from '../../categories/hooks/use-categories'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { useAdsInfinite } from '../hooks'
import { IAdsListResponse } from '../types/ad.types'
import { buildAdsQueryParams } from '../utils/build-ads-query-params'
import { AdsGrid } from './ads-grid'

// Ограничение длины поискового запроса в сообщении пустого состояния — на
// случай, если в URL руками (или ботом) подставили аномально длинную
// строку в ?search=: без этого «По запросу «...5000 символов...» ничего
// не найдено» ломал бы вёрстку страницы.
const MAX_DISPLAYED_QUERY_LENGTH = 80

function formatDisplayedQuery(query: string): string {
  const trimmed = query.trim()
  return trimmed.length > MAX_DISPLAYED_QUERY_LENGTH
    ? `${trimmed.slice(0, MAX_DISPLAYED_QUERY_LENGTH)}…`
    : trimmed
}

interface CatalogAdsGridProps {
  serverSlug?: string | null
  layout?: string
  className?: 'cols-1' | 'cols-4'
  // Первая страница, уже отрисованная сервером (см. page.tsx) — сюда
  // приходит ИМЕННО тот же запрос, что построит этот компонент сам
  // (buildAdsQueryParams с теми же входными данными), поэтому подстав
  // ленная сюда initialData у useAdsInfinite не разъезжается с тем, что
  // ожидает клиент. Компонент должен получать новый key (см. CatalogContent
  // — key строится из serverSlug + querystring) при каждой смене
  // категории/фильтра, чтобы размонтироваться и заново засеяться свежим
  // initialAds вместо того, чтобы копить старые «Показать ещё»-страницы
  // поверх нового запроса.
  initialAds: IAdsListResponse
}

// SSR первой страницы + «Показать ещё» на клиенте (S1 в ROADMAP.md) —
// именно поэтому отдельно от AdsClient (который используется и на главной,
// см. HomeAdsFeed, где initialData с сервера нет и пагинация не нужна).
export function CatalogAdsGrid({ serverSlug, layout, className, initialAds }: CatalogAdsGridProps) {
  const searchParams = useSearchParams()
  const { categories, isLoadingCategories } = useCategories()
  const filters = useCatalogFilters()
  const searchQuery = searchParams.get('search') ?? undefined
  const slug = serverSlug?.split('/').at(-1) ?? searchParams.get('category') ?? undefined

  const categoryId = useMemo(() => {
    if (!slug) return undefined
    return findCategoryIdBySlug(categories, slug)
  }, [categories, slug])

  const params = useMemo(
    () => buildAdsQueryParams({ categoryId, search: searchQuery, filters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryId, searchQuery, filters.sortBy, filters.unit, filters.minPrice, filters.maxPrice, filters.regionIsoCode, filters.localityFiasId, filters.sellerType, filters.features]
  )

  const { ads, total, isFetchingNextPage, hasNextPage, fetchNextPage } = useAdsInfinite(params, initialAds)

  // Поисковый запрос — приоритетнее generic-сообщения про фильтры: если
  // пользователь искал конкретный текст и ничего не нашлось, сообщение
  // должно называть именно этот запрос, а не отправлять "попробуйте
  // изменить фильтры" (запрос сам по себе фильтром для filters.hasActiveFilters
  // не считается — см. useCatalogFilters — и раньше в этом случае
  // показывалось совсем generic "В этой категории пока нет объявлений",
  // как будто в категории вообще пусто).
  const trimmedSearchQuery = searchQuery?.trim()
  const emptyMessage = trimmedSearchQuery
    ? `По запросу «${formatDisplayedQuery(trimmedSearchQuery)}» ничего не найдено`
    : filters.hasActiveFilters
      ? 'Ничего не найдено — попробуйте изменить фильтры'
      : 'В этой категории пока нет объявлений'

  return (
    <div>
      {total > 0 && (
        <p className='mb-3 text-sm text-gray-500 sm:mb-4'>
          Найдено {total} {pluralizeRu(total, ['объявление', 'объявления', 'объявлений'])}
        </p>
      )}
      <AdsGrid
        ads={ads}
        layout={layout}
        className={className}
        // Пока не известен точный categoryId (сайдбар/поисковая строка ещё
        // тянут категории) initialAds всё равно уже есть с сервера — грид
        // никогда не показывает пустой скелетон поверх готовых данных
        // первой отрисовки.
        isLoading={false}
        emptyMessage={emptyMessage}
      />
      {hasNextPage && (
        <div className='mt-6 flex justify-center sm:mt-8'>
          <Button
            variant='outline'
            size='lg'
            // isLoadingCategories — короткое окно сразу после монтирования,
            // пока клиентский список категорий (нужен для categoryId
            // следующей страницы) ещё не пришёл; initialAds с сервера уже
            // отрисованы, так что это не блокирует первую отрисовку.
            disabled={isFetchingNextPage || isLoadingCategories}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className='size-4 animate-spin' />
                Загружаем...
              </>
            ) : (
              'Показать ещё'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
