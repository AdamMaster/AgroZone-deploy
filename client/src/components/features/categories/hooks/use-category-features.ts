'use client'

import { useQuery } from '@tanstack/react-query'

import { categoriesService } from '../services'

// Определения атрибутов ОДНОЙ категории — по требованию, а не из массового
// дерева (см. комментарий у ICategory.categoryFeatures в
// categories.types.ts: раньше все 4271 атрибута всех 610 категорий ехали
// прямо в GET /categories, теперь это отдельный GET /categories/:id/features).
// queryKey специально совпадает с тем, что использует CategoryCascader при
// ручном queryClient.fetchQuery — тот же ключ значит, что после выбора
// категории в форме подачи объявления повторный рендер (например,
// AdForm.useCategoryFeatures при редактировании) переиспользует уже
// закэшированный react-query результат, а не бьёт в бэкенд ещё раз.
export function useCategoryFeatures(categoryId?: string) {
  const { data: features = [], isLoading } = useQuery({
    queryKey: ['category-features', categoryId],
    queryFn: () => categoriesService.findFeatures(categoryId!),
    enabled: !!categoryId
  })

  return { features, isLoadingFeatures: isLoading }
}
