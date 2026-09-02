import { create } from 'zustand'

interface CategoryMenuState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useCategoryMenuStore = create<CategoryMenuState>(set => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set(state => ({ isOpen: !state.isOpen }))
}))
