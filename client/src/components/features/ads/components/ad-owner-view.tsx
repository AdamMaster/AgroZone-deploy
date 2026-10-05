'use client'

import { notFound, redirect } from 'next/navigation'

import { Loading } from '@/components/ui'

import { useCategoryFeatures } from '../../categories/hooks/use-category-features'
import { useMyAd } from '../hooks'
import { ICategory } from '../types/ad.types'
import { buildCategoryPath } from '../utils/build-category-path'
import { AdDetail } from './ad-detail'

interface AdOwnerViewProps {
  id: string
  categories: ICategory[]
}

// Страница просмотра объявления глазами владельца для любого статуса
// (архив, черновик, отклонено, на модерации, срок истёк) — публичный
// /ads/[id] такие объявления не отдаёт (404). Рендерится тем же AdDetail,
// что и публичная страница, поэтому выглядит так же, плюс плашка статуса и
// действия владельца (см. AdDetail).
export const AdOwnerView = ({ id, categories }: AdOwnerViewProps) => {
  const { ad, isLoading } = useMyAd(id)
  const { features } = useCategoryFeatures(ad?.categoryId)

  if (isLoading) return <Loading />

  if (!ad) return notFound()

  // Опубликованное объявление живёт на публичной странице (там же и
  // каноническая ссылка) — например, после «Опубликовать снова».
  if (ad.status === 'PUBLISHED') return redirect(`/ads/${ad.id}`)

  return <AdDetail ad={ad} categoryFeatures={features} categoryPath={buildCategoryPath(categories, ad.categoryId)} />
}
