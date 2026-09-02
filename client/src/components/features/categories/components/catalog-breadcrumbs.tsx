'use client'

import { useParams, usePathname } from 'next/navigation'
import { useMemo } from 'react'

import { CategoryBreadcrumbItem, CategoryBreadcrumbs } from '@/components/features/ads/components/category-breadcrumbs'
import { Container } from '@/components/layout'

import { useCategories } from '../hooks/use-categories'
import { buildCategoryMap } from '../utils/category-utils'

export const CatalogBreadcrumbs = () => {
  const pathname = usePathname()
  const params = useParams<{ slug?: string[] }>()
  const { categories } = useCategories()

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
