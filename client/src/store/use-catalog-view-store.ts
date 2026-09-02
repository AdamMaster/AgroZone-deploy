import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CatalogViewLayout = 'cols-1' | 'cols-4'

interface CatalogViewStore {
  layout: CatalogViewLayout
  setLayout: (layout: CatalogViewLayout) => void
}

// Раскладка каталога по умолчанию (список/сетка) — часть раздела
// "Персонализация" (/profile/settings/personalization). Хранится в
// localStorage через zustand persist, без авторизации — тот же подход,
// что и у useHomeLocationStore. На мобилках (< md) переключатель скрыт и
// всегда применяется сеточная раскладка (см. CatalogContent), это
// значение влияет только на десктоп.
export const useCatalogViewStore = create<CatalogViewStore>()(
  persist(
    set => ({
      layout: 'cols-1',
      setLayout: layout => set({ layout })
    }),
    { name: 'catalog-view' }
  )
)
