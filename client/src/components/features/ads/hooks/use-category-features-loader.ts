'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { categoriesService } from '@/components/features/categories/services'

import { ICategoryFeature } from '../types/ad.types'

// Общая для CategoryCascader (форма подачи объявления продавцом,
// components/features/ads/components/category-cascader.tsx) и
// AdminCategorySearchField (админка, components/features/admin/components,
// см. SetAdCategoryDialog) логика догрузки характеристик ЛИСТОВОЙ
// категории — сами CategoryFeature в дереве категорий не лежат (см.
// комментарий у ICategory.categoryFeatures в categories.types.ts),
// догружаются отдельным запросом в момент выбора категории. Раньше эта
// логика была инлайном внутри CategoryCascader.handleCategorySelect —
// вынесена в хук, а не скопирована во второй компонент, именно чтобы
// у выбора категории в двух разных местах UI (форма продавца и админка)
// осталась ровно одна реализация запроса/обработки ошибки.
//
// queryKey специально совпадает с тем, что использует useCategoryFeatures,
// чтобы результат переиспользовался из кэша react-query, если эта же
// категория уже была загружена где-то ещё (например, при повторном
// открытии формы редактирования или диалога в админке).
export function useCategoryFeaturesLoader() {
  const queryClient = useQueryClient()

  return async (categoryId: string): Promise<ICategoryFeature[] | null> => {
    try {
      return await queryClient.fetchQuery({
        queryKey: ['category-features', categoryId],
        queryFn: () => categoriesService.findFeatures(categoryId)
      })
    } catch {
      toast.error('Не удалось загрузить параметры категории. Попробуйте выбрать её ещё раз.')
      return null
    }
  }
}
