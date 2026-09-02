import { create } from 'zustand'

interface AdStore {
  categoryPath: string[]
  setCategoryPath: (path: string[]) => void
}

export const useAdStore = create<AdStore>(set => ({
  categoryPath: [],
  setCategoryPath: path => set({ categoryPath: path })
}))
