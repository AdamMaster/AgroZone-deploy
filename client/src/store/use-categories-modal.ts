import { create } from 'zustand'

interface CategoriesModalStore {
  isOpen: boolean
  // Путь категории, на которую нужно открыть окно (fullPath). Нужен для
  // тапа по плитке верхнего уровня на главной — там мы ещё не переходили
  // на /catalog/..., поэтому CategoryList не может определить категорию
  // из URL-параметров, как в сценарии с кнопкой «Все категории».
  categoryPath: string | null
  onOpen: (categoryPath?: string) => void
  onClose: () => void
}

export const useCategoriesModal = create<CategoriesModalStore>(set => ({
  isOpen: false,
  categoryPath: null,
  onOpen: categoryPath => set({ isOpen: true, categoryPath: categoryPath ?? null }),
  onClose: () => set({ isOpen: false, categoryPath: null })
}))
