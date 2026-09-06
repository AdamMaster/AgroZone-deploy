import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { adsService } from '@/components/features/ads/services'
import { IAdsListResponse } from '@/components/features/ads/types/ad.types'
import { CATALOG_PAGE_SIZE } from '@/components/features/ads/utils/build-ads-query-params'
import { SellerCard, SellerProfileContent } from '@/components/features/sellers/components'
import { sellersService } from '@/components/features/sellers/services'
import { Container } from '@/components/layout'

import { buildPageMetadata } from '@/shared/utils/metadata'

interface SellerPageProps {
  params: Promise<{ id: string }>
  // Не используется напрямую — страница не читает ни один конкретный
  // параметр. Присутствие пропа само по себе переводит маршрут в
  // динамический рендеринг (тот же приём, что и в catalog/[[...slug]]/
  // page.tsx, см. комментарий там же и S1 в ROADMAP.md) — без этого
  // клиентский SellerProfileContent (useCatalogFilters -> useSearchParams,
  // сортировка списка) разъезжался бы со статической предгенерацией
  // страницы.
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// cache() дедуплицирует между generateMetadata и самим компонентом страницы
// в рамках одного рендера — тот же приём, что и в ads/[id]/page.tsx.
const getSeller = cache(async (id: string) => {
  try {
    return await sellersService.findPublic(id)
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: SellerPageProps): Promise<Metadata> {
  const { id } = await params
  const seller = await getSeller(id)
  const path = `/sellers/${id}`

  if (!seller) {
    return buildPageMetadata({
      title: 'Продавец не найден',
      description: 'Такого продавца нет на AgroZone — возможно, аккаунт удалён.',
      path
    })
  }

  const name = seller.displayName ?? 'Продавец'

  return buildPageMetadata({
    // Заголовок уже содержит «AgroZone» сам по себе — title.absolute
    // (brandInTitle) не даёт общему template в app/layout.tsx приписать
    // бренд второй раз (см. тот же приём в ads/[id]/page.tsx).
    title: `${name} — объявления на AgroZone`,
    description: `Все объявления продавца ${name} на агропромышленной площадке AgroZone.`,
    path,
    brandInTitle: true
  })
}

export default async function SellerPage({ params, searchParams }: SellerPageProps) {
  const { id } = await params
  await searchParams

  const seller = await getSeller(id)

  if (!seller) {
    return notFound()
  }

  let initialAds: IAdsListResponse = { items: [], total: 0, page: 1, limit: CATALOG_PAGE_SIZE }

  try {
    // revalidate 120с — тот же интервал и то же обоснование, что и у
    // каталога (S1 в ROADMAP.md): достаточно свежо для меняющегося набора
    // объявлений продавца, не бьёт в базу на каждый заход.
    initialAds = await adsService.findAll(
      { sellerId: seller.id, page: 1, limit: CATALOG_PAGE_SIZE },
      { next: { revalidate: 120 } }
    )
  } catch {
    // Не роняем страницу целиком, если бэкенд на секунду недоступен —
    // карточка продавца всё равно отрисуется, список объявлений останется
    // пустым до следующего клиентского рефетча (SellerProfileContent всё
    // равно смонтируется и попробует сам).
  }

  return (
    <Container>
      <div className='grid grid-cols-1 gap-8 pt-4 sm:pt-6 xl:grid-cols-[320px_1fr]'>
        <div>
          <SellerCard seller={seller} />
        </div>
        <SellerProfileContent sellerId={seller.id} initialAds={initialAds} />
      </div>
    </Container>
  )
}
