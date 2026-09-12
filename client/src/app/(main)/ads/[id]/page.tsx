import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { AdDetail } from '@/components/features/ads/components'
import { adsService } from '@/components/features/ads/services'
import { categoriesService } from '@/components/features/categories/services'
import { Container, JsonLd } from '@/components/layout'

import { findCategoryById, getPathToCategory } from '@/shared/utils'
import { JsonLdBreadcrumbItem, buildBreadcrumbListJsonLd, buildProductJsonLd } from '@/shared/utils/json-ld'
import { buildPageMetadata, truncateForMeta } from '@/shared/utils/metadata'

interface AdPageProps {
  params: Promise<{ id: string }>
}

// cache() дедуплицирует запрос между generateMetadata и самим компонентом
// страницы в рамках одного рендера — к бэкенду уйдёт только один запрос.
// findOne на сервере сам возвращает 404 для черновиков/чужих/просроченных
// объявлений, так что тут достаточно поймать ошибку и показать notFound().
const getAd = cache(async (id: string) => {
  try {
    return await adsService.findOne(id)
  } catch {
    return null
  }
})

export async function generateMetadata({ params }: AdPageProps): Promise<Metadata> {
  const { id } = await params
  const ad = await getAd(id)

  if (!ad) {
    return buildPageMetadata({
      title: 'Объявление не найдено',
      description:
        'Такого объявления нет на AgroZone — возможно, оно снято с публикации или срок его размещения истёк.',
      path: `/ads/${id}`
    })
  }

  return buildPageMetadata({
    title: `${ad.title} — купить на AgroZone`,
    description: truncateForMeta(ad.description, 160),
    path: `/ads/${ad.id}`,
    images: ad.images,
    brandInTitle: true
  })
}

export default async function AdPage({ params }: AdPageProps) {
  const { id } = await params

  const ad = await getAd(id)

  if (!ad) {
    return notFound()
  }

  const [categories, categoryFeatures, similarAds] = await Promise.all([
    categoriesService.findAll().catch(() => []),
    categoriesService.findFeatures(ad.categoryId).catch(() => []),
    adsService
      .findAll({ categoryId: ad.categoryId, excludeAdId: ad.id, limit: 8 }, { next: { revalidate: 120 } })
      .then(response => response.items)
      .catch(() => [])
  ])

  const categoryChain = getPathToCategory(categories, ad.categoryId)
    .map(id => findCategoryById(categories, id))
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const categoryPath = categoryChain.map(c => ({ name: c.name, href: `/catalog/${c.fullPath}` }))

  const breadcrumbItems: JsonLdBreadcrumbItem[] = [
    { name: 'Объявления', path: '/catalog' },
    ...categoryPath.map(c => ({ name: c.name, path: c.href })),
    { name: ad.title, path: `/ads/${ad.id}` }
  ]

  return (
    <div>
      <Container>
        <JsonLd data={[buildBreadcrumbListJsonLd(breadcrumbItems), buildProductJsonLd(ad)]} />
        <AdDetail ad={ad} categoryFeatures={categoryFeatures} categoryPath={categoryPath} similarAds={similarAds} />
      </Container>
    </div>
  )
}
