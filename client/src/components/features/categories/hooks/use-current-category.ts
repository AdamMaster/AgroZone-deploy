'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'

import { ICategory } from '../types'

const findCategoryBySlug = (items: ICategory[], slug?: string): ICategory | null => {
  for (const item of items) {
    if (item.slug === slug) return item

    if (item.children?.length) {
      const found = findCategoryBySlug(item.children, slug)

      if (found) return found
    }
  }

  return null
}

// Определяет текущую категорию каталога по последнему сегменту URL
// (маршрут /catalog/[[...slug]]) — тот же подход, что уже используется в
// CategoryTitle, вынесен в отдельный хук, чтобы им мог пользоваться и
// сайдбар фильтра.
export function useCurrentCategory(categories: ICategory[]) {
  const params = useParams()

  return useMemo(() => {
    const slugArray = params?.slug as string[] | undefined

    if (!slugArray?.length) return null

    return findCategoryBySlug(categories, slugArray.at(-1))
  }, [categories, params])
}
