import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { AdDetail } from '@/components/features/ads/components'
import { adsService } from '@/components/features/ads/services'
import { categoriesService } from '@/components/features/categories/services'
import { Container } from '@/components/layout'

import { findCategoryById, getPathToCategory } from '@/shared/utils'

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
    return { title: 'Объявление не найдено | AgroZone' }
  }

  return {
    title: `${ad.title} — купить на AgroZone`,
    description: ad.description.slice(0, 160),
    ...(ad.images[0] && { openGraph: { images: [ad.images[0]] } })
  }
}

export default async function AdPage({ params }: AdPageProps) {
  const { id } = await params

  const [ad, categories] = await Promise.all([getAd(id), categoriesService.findAll().catch(() => [])])

  if (!ad) {
    return notFound()
  }

  const categoryChain = getPathToCategory(categories, ad.categoryId)
    .map(id => findCategoryById(categories, id))
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const leafCategory = categoryChain.at(-1)

  const categoryPath = categoryChain.map(c => ({ name: c.name, href: `/catalog/${c.fullPath}` }))

  return (
    <div>
      <Container>
        <AdDetail ad={ad} categoryFeatures={leafCategory?.categoryFeatures} categoryPath={categoryPath} />
      </Container>
    </div>
  )
}
