'use client'

import { useParams } from 'next/navigation'
import { useMemo } from 'react'

import { Heading } from '@/components/ui'

import { ICategory } from '../types'

interface CategoryTitleProps {
  categories: ICategory[]
  className?: string
}

export const CategoryTitle = ({ categories, className }: CategoryTitleProps) => {
  const params = useParams()

  const currentCategory = useMemo(() => {
    const slugArray = params?.slug as string[] | undefined

    if (!slugArray?.length) return null

    const slug = slugArray.at(-1)

    const findCategory = (items: ICategory[]): ICategory | null => {
      for (const item of items) {
        if (item.slug === slug) {
          return item
        }

        if (item.children?.length) {
          const found = findCategory(item.children)

          if (found) return found
        }
      }

      return null
    }

    return findCategory(categories)
  }, [categories, params])

  if (!currentCategory) {
    return (
      <Heading level={2} className={className}>
        Объявления
      </Heading>
    )
  }

  return (
    <Heading level={2} className={className}>
      {currentCategory.name}
    </Heading>
  )
}
