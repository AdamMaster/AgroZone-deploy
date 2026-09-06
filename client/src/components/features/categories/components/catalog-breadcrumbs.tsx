'use client'

import { useParams, usePathname } from 'next/navigation'
import { useMemo } from 'react'

import { CategoryBreadcrumbItem, CategoryBreadcrumbs } from '@/components/features/ads/components/category-breadcrumbs'
import { Container } from '@/components/layout'

import { ICategory } from '../types'
import { buildCategoryMap } from '../utils/category-utils'

interface CatalogBreadcrumbsWidgetProps {
  // Категории приходят пропом из MainLayout (там они уже получены на
  // сервере одним запросом, см. комментарий в MainLayout). Раньше этот
  // компонент дублировал загрузку через useCategories() — он смонтирован
  // на КАЖДОЙ странице (в т.ч. на главной, где хлебные крошки всё равно не
  // рендерятся, см. breadcrumbItems.length === 0 ниже), и такой же
  // самостоятельный запрос параллельно делал CategoryMenu — по факту это
  // и был тот самый лишний повторный fetch /categories из аудита
  // (P3 в ROADMAP.md), подтверждённый трассировкой сети в реальном браузере.
  categories: ICategory[]
}

export const CatalogBreadcrumbs = ({ categories }: CatalogBreadcrumbsWidgetProps) => {
  const pathname = usePathname()
  const params = useParams<{ slug?: string[] }>()

  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories])

  const breadcrumbItems = useMemo<CategoryBreadcrumbItem[]>(() => {
    if (!pathname.startsWith('/catalog')) return []

    const slugSegments = params.slug ?? []

    if (!slugSegments.length) return []

    const items: CategoryBreadcrumbItem[] = []

    for (let i = 0; i < slugSegments.length; i++) {
      const partialPath = slugSegments.slice(0, i + 1).join('/')
      const lookup = categoryMap.get(partialPath)

      if (!lookup) break

      items.push({
        name: lookup.category.name,
        href: i < slugSegments.length - 1 ? `/catalog/${partialPath}` : undefined
      })
    }

    return items
  }, [categoryMap, params.slug, pathname])

  if (!breadcrumbItems.length) return null

  return (
    <Container className='w-full'>
      <CategoryBreadcrumbs items={[{ name: 'Объявления', href: '/catalog' }, ...breadcrumbItems]} />
    </Container>
  )
}
