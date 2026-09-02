'use client'

import { useQuery } from '@tanstack/react-query'

import { categoriesService } from '../services'

export function useCategories() {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.findAll()
  })

  return { categories, isLoadingCategories: isLoading }
}
